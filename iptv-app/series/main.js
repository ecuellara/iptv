document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, verificando sesión...');

  Auth.getCurrentAccount(account => {
    if (!account || !account.server || !account.user || !account.pass) {
      console.warn('Sesión inválida, redirigiendo...');
      window.location.href = '../../index.html';
      return;
    }

    console.log('Sesión válida:', account);
    iniciarModuloSeries(account.server, account.user, account.pass);
  });
});

function iniciarModuloSeries(server, user, pass) {
  const sidebar = document.querySelector('.sidebar');
  const content = document.querySelector('.content');
  const playerContainer = document.getElementById('player-container');
  const videoPlayer = document.getElementById('video-player');
  const nowPlaying = document.getElementById('now-playing');

  let seriesData = [];

  loadCategories();

  async function loadCategories() {
    try {
      const categories = await fetchSeriesCategories();
      renderCategories(categories);
    } catch (error) {
      console.error('Error inicial:', error);
      showAlert('Error al cargar categorías de series.', 'error');
    }
  }

  async function fetchSeriesCategories() {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_series_categories`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener categorías');
    return res.json();
  }

  async function fetchSeriesByCategory(categoryId) {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_series`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener series');
    const allSeries = await res.json();
    return allSeries.filter(s => s.category_id === categoryId);
  }

  async function fetchSeriesInfo(seriesId) {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_series_info&series_id=${seriesId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener detalles de la serie');
    return res.json();
  }

  function renderCategories(categories) {
    sidebar.innerHTML = '';
    categories.forEach(category => {
      const el = document.createElement('div');
      el.className = 'category-item';
      el.innerHTML = `
        <i class="fas fa-tv"></i>
        <span>${category.category_name}</span>
      `;
      el.onclick = async () => {
        try {
          content.innerHTML = '<div class="loading">Cargando series...</div>';
          const seriesList = await fetchSeriesByCategory(category.category_id);
          seriesData = seriesList;
          renderSeries(seriesList);
        } catch (error) {
          console.error(error);
          showAlert('No se pudieron cargar las series.', 'error');
        }
      };
      sidebar.appendChild(el);
    });
  }

  function renderSeries(seriesList) {
    content.innerHTML = '';
    if (seriesList.length === 0) {
      content.innerHTML = '<div class="empty">No hay series en esta categoría</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'series-grid';

    seriesList.forEach(serie => {
      const card = document.createElement('div');
      card.className = 'series-card';
      card.innerHTML = `
        <div class="series-cover-container">
          <img class="series-cover" src="${serie.cover || '../shared/no-image.jpg'}" alt="${serie.name}" onerror="this.src='../shared/no-image.jpg'">
        </div>
        <div class="series-info">
          <div class="series-name">${serie.name}</div>
          ${serie.year ? `<div class="series-year">${serie.year}</div>` : ''}
        </div>
      `;
      card.onclick = () => showSeriesDetails(serie);
      grid.appendChild(card);
    });

    content.appendChild(grid);
  }

  async function showSeriesDetails(serie) {
    content.innerHTML = '<div class="loading">Cargando detalles...</div>';

    try {
      const details = await fetchSeriesInfo(serie.series_id);
      const info = details.info || {};
      const episodes = details.episodes || {};

      content.innerHTML = `
        <div class="series-details">
          <div class="detail-header">            
            <h2>${info.name || serie.name} <button class="back-button"><i class="fas fa-arrow-left"></i> Volver</button></h2>
          </div>
          
          <div class="detail-content">
            <div class="detail-poster">
              <img src="${info.cover || serie.cover || '../shared/no-image.jpg'}" 
                   alt="${info.name || serie.name}" 
                   onerror="this.src='../shared/no-image.jpg'">
            </div>
            
            <div class="detail-info">
              <div class="detail-description">
                ${info.plot || 'Sin descripción disponible.'}
              </div>
            </div>
          </div>
          
          <div class="season-list">
            ${Object.entries(episodes).map(([season, eps]) => `
              <div class="season">
                <div class="season-header">
                  <h3>Temporada ${season}</h3>
                  <i class="fas fa-chevron-down"></i>
                </div>
                <div class="episodes-grid">
                  ${eps.map(ep => `
                    <div class="episode-card" 
                         data-id="${ep.id}" 
                         data-ext="${ep.container_extension || 'mp4'}">                      
                      <div class="episode-title">${ep.title || 'Sin título'}</div>
                      ${ep.duration ? `<div class="episode-duration">${formatDuration(ep.duration)}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      document.querySelector('.back-button').onclick = () => renderSeries(seriesData);

      document.querySelectorAll('.episode-card').forEach(card => {
        card.onclick = () => {
          const streamId = card.getAttribute('data-id');
          const ext = card.getAttribute('data-ext');
          const title = `${serie.name} - ${card.querySelector('.episode-title').textContent}`;
          playEpisode(streamId, ext, title);
        };
      });

      document.querySelectorAll('.season-header').forEach(header => {
        header.addEventListener('click', () => {
          header.classList.toggle('active');
          const episodesGrid = header.nextElementSibling;

          if (header.classList.contains('active')) {
            episodesGrid.style.display = 'grid';
            episodesGrid.style.height = 'auto';
            const height = episodesGrid.scrollHeight;
            episodesGrid.style.height = '0';
            setTimeout(() => {
              episodesGrid.style.height = `${height}px`;
            }, 10);
          } else {
            episodesGrid.style.height = `${episodesGrid.scrollHeight}px`;
            setTimeout(() => {
              episodesGrid.style.height = '0';
            }, 10);
            setTimeout(() => {
              episodesGrid.style.display = 'none';
            }, 300);
          }
        });
      });

    } catch (error) {
      console.error(error);
      content.innerHTML = '<div class="error">Error al cargar detalles de la serie</div>';
    }
  }

  function playEpisode(streamId, extension, title) {
    const streamUrl = `${server}/series/${user}/${pass}/${streamId}.${extension}`;

    playerContainer.style.display = 'block';
    videoPlayer.src = streamUrl;
    videoPlayer.load();

    nowPlaying.innerHTML = `
      <i class="fas fa-play"></i>
      <strong>Reproduciendo:</strong> ${title}
    `;

    videoPlayer.play().catch(err => {
      console.error('Error al reproducir:', err);
      showAlert('Error al reproducir el episodio', 'error');
    });
  }

  function formatDuration(seconds) {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}m`;
  }

  function showAlert(msg, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.innerHTML = `
      <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
      <span>${msg}</span>
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }
}
