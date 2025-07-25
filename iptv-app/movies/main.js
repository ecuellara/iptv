document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, iniciando módulo de películas...');

  Auth.getCurrentAccount(account => {
    if (!account || !account.server || !account.user || !account.pass) {
      console.warn('Sesión inválida, redirigiendo...');
      window.location.href = '../../index.html';
      return;
    }

    console.log('Sesión válida:', account);
    iniciarModuloPeliculas(account.server, account.user, account.pass);
  });
});

function iniciarModuloPeliculas(server, user, pass) {
  const sidebar = document.querySelector('.sidebar');
  const content = document.querySelector('.content');
  const playerContainer = document.getElementById('player-container');
  const videoPlayer = document.getElementById('video-player');
  const nowPlaying = document.getElementById('now-playing');

  let moviesData = [];
  let categoriesData = [];
  let currentPlaying = null;

  // Configurar evento para cerrar el reproductor
  document.getElementById('close-player').addEventListener('click', () => {
    playerContainer.classList.add('hidden');
    videoPlayer.pause();
    videoPlayer.src = '';
  });

  loadInitialData();

  async function loadInitialData() {
    try {
      categoriesData = await fetchVodCategories();
      if (categoriesData.length > 0) {
        renderCategories(categoriesData);
        await loadMovies(categoriesData[0].category_id);
      } else {
        showEmptyMessage('No hay categorías disponibles');
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      showAlert('Error al cargar las categorías de películas.', 'error');
    }
  }

  async function fetchVodCategories() {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_vod_categories`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar categorías VOD');
    return await res.json();
  }

  async function fetchVodByCategory(categoryId) {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_vod_streams&category_id=${categoryId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar películas');
    return await res.json();
  }

  async function fetchVodInfo(streamId) {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_vod_info&vod_id=${streamId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener detalles del VOD');
    return await res.json();
  }

  function renderCategories(categories) {
    sidebar.innerHTML = '';
    categories.forEach(category => {
      const el = document.createElement('div');
      el.className = 'category-item';
      el.innerHTML = `<i class="fas fa-film"></i><span>${category.category_name}</span>`;
      el.addEventListener('click', async () => {
        document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        await loadMovies(category.category_id);
      });
      sidebar.appendChild(el);
    });

    if (categories.length > 0) {
      sidebar.querySelector('.category-item').classList.add('active');
    }
  }

  async function loadMovies(categoryId) {
    try {
      content.innerHTML = '<div class="loading">Cargando películas...</div>';
      const movies = await fetchVodByCategory(categoryId);
      moviesData = movies;
      if (movies.length > 0) {
        renderMovies(movies);
      } else {
        showEmptyMessage('No hay películas en esta categoría');
      }
    } catch (error) {
      console.error('Error al cargar películas:', error);
      content.innerHTML = '<div class="error">Error al cargar películas</div>';
    }
  }

  function renderMovies(movies) {
    content.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'movies-grid';

    movies.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'movie-card';
      card.innerHTML = `
        <div class="movie-cover-container">
          <img class="movie-cover" src="${movie.stream_icon || '../shared/no-image.jpg'}" alt="${movie.name}">
          ${movie.rating ? `<div class="movie-rating">${movie.rating}</div>` : ''}
        </div>
        <div class="movie-info">
          <div class="movie-title">${movie.name}</div>
          <div class="movie-meta">
            <span>${movie.year || 'Año no disponible'}</span>
            <span>${movie.duration || 'Duración no disponible'}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => showMovieDetails(movie));
      grid.appendChild(card);
    });

    content.appendChild(grid);
  }

  async function showMovieDetails(movie) {
    try {
      content.innerHTML = '<div class="loading">Cargando información...</div>';
      const movieInfo = await fetchVodInfo(movie.stream_id);
      const info = movieInfo.info || {};

      const data = {
        name: info.name || movie.name || 'Sin título',
        year: info.year || 'N/A',
        duration: formatDuration(info.duration || info.runtime || null),
        genre: info.genre || 'N/A',
        country: info.country || 'N/A',
        director: info.director || 'N/A',
        cast: info.cast || 'N/A',
        description: info.description || info.plot || 'No disponible',
        stream_id: movie.stream_id,
        container_extension: info.container_extension || movie.container_extension || 'mp4',
        image: info.movie_image || movie.stream_icon || '../shared/no-image.jpg'
      };

      content.innerHTML = `
        <div class="movie-details">
          <div class="detail-header">              
            <h2>${data.name} <button class="back-button"><i class="fas fa-arrow-left"></i> Volver</button></h2>              
          </div>
          <div class="detail-content">
            <div class="detail-poster">
              <img src="${data.image}" alt="${data.name}" onerror="this.src='../shared/no-image.jpg'">
              <button class="play-button" data-id="${data.stream_id}" data-ext="${data.container_extension}">
                <i class="fas fa-play"></i> Reproducir
              </button>
            </div>
            <div class="detail-info">
              <p><strong>Año:</strong> ${data.year}</p>
              <p><strong>Duración:</strong> ${data.duration}</p>
              <p><strong>Género:</strong> ${data.genre}</p>
              <p><strong>País:</strong> ${data.country}</p>
              <p><strong>Director:</strong> ${data.director}</p>
              <p><strong>Reparto:</strong> ${data.cast}</p>
              <p><strong>Descripción:</strong> ${data.description}</p>
            </div>
          </div>
        </div>
      `;

      document.querySelector('.back-button').addEventListener('click', () => {
        renderMovies(moviesData);
      });

      document.querySelector('.play-button').addEventListener('click', e => {
        const btn = e.currentTarget;
        playMovie({
          name: data.name,
          stream_id: btn.getAttribute('data-id'),
          container_extension: btn.getAttribute('data-ext')
        });
      });

    } catch (error) {
      console.error('Error al cargar detalles de la película:', error);
      content.innerHTML = '<div class="error">Error al cargar detalles de la película</div>';
    }
  }

  function playMovie(movie) {
    const streamUrl = `${server}/movie/${user}/${pass}/${movie.stream_id}.${movie.container_extension}`;
    
    playerContainer.classList.remove('hidden');
    videoPlayer.src = streamUrl;
    videoPlayer.load();

    nowPlaying.innerHTML = `
      <i class="fas fa-play"></i>
      <strong>Reproduciendo:</strong> ${movie.name}
    `;

    videoPlayer.play().catch(err => {
      console.error('Error al reproducir:', err);
      showAlert('Error al reproducir la película', 'error');
    });
  }

  function formatDuration(duration) {
    if (!duration) return 'N/A';
    if (!isNaN(duration)) {
      const h = Math.floor(duration / 3600);
      const m = Math.floor((duration % 3600) / 60);
      return `${h}h ${m}m`;
    }
    return duration;
  }

  function showEmptyMessage(message) {
    content.innerHTML = `<div class="empty">${message}</div>`;
  }

  function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.innerHTML = `
      <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }
}