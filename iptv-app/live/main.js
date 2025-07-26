document.addEventListener('DOMContentLoaded', () => {
  // Función para actualizar el reloj
  function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    
    const clockElement = document.getElementById('live-clock');
    if (clockElement) {
      clockElement.innerHTML = `${timeString}`;
    }
  }
  
  // Actualizar inmediatamente y luego cada segundo
  updateClock();
  setInterval(updateClock, 1000);

  // Verifica si hay sesión activa; si no, redirige al login
  Auth.getCurrentAccount(account => {
    if (!account || !account.server || !account.user || !account.pass) {
      window.location.href = '../../index.html';
      return;
    }
    // Si hay sesión, inicializa el módulo Live
    iniciarLive(account.server, account.user, account.pass);
  });
});

function iniciarLive(server, user, pass) {
  // Elementos del DOM necesarios
  const categoriesContainer = document.getElementById('categories-container');
  const channelsContainer = document.getElementById('channels-container');
  const channelsList = document.getElementById('channels-list');
  const currentCategory = document.getElementById('current-category');
  const playerContainer = document.getElementById('player-container');
  const videoPlayer = document.getElementById('video-player');
  const nowPlaying = document.getElementById('now-playing');
  const backButton = document.querySelector('.back-to-categories');
  const searchInput = document.getElementById('search-input');

  let channelsData = [];
  let filteredChannels = [];
  let hls = null;

  // Carga categorías y canales desde el servidor
  Promise.all([fetchCategories(), fetchChannels()])
    .then(([categories, channels]) => {
      allCategories = categories;
      channelsData = channels;
      updateCategoryCounts();
      renderCategories(categories);
      setupEventListeners(); // Establece eventos de navegación
    })
    .catch(error => {
      showAlert('Error al cargar canales. Intenta más tarde.', 'error');
    });

  // Petición: categorías IPTV
  function fetchCategories() {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_live_categories`;
    return fetch(url).then(res => {
      if (!res.ok) throw new Error('Fallo al obtener categorías');
      return res.json();
    });
  }

  // Petición: canales IPTV
  function fetchChannels() {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`;
    return fetch(url).then(res => {
      if (!res.ok) throw new Error('Fallo al obtener canales');
      return res.json();
    });
  }

  // Cuenta cuántos canales hay por categoría
  function updateCategoryCounts() {
    allCategories.forEach(cat => {
      const count = channelsData.filter(ch => ch.category_id === cat.category_id).length;
      cat.total_channels = count;
    });
  }

  // Dibuja tarjetas de categorías
  function renderCategories(categories) {
    categoriesContainer.innerHTML = '';

    if (categories.length === 0) {
      categoriesContainer.innerHTML = '<div class="empty-message">No hay categorías disponibles</div>';
      return;
    }

    categories.forEach(category => {
      const el = document.createElement('div');
      el.className = 'category-card';
      el.innerHTML = `
        <i class="fas fa-folder"></i>
        <h3>${category.category_name}</h3>
        <span>${category.total_channels || '0'} canales</span>
      `;
      el.addEventListener('click', () => {
        showChannelsForCategory(category.category_id, category.category_name);
      });
      categoriesContainer.appendChild(el);
    });
  }

  // Al hacer clic en categoría: muestra canales
  function showChannelsForCategory(categoryId, categoryName) {
    categoriesContainer.classList.add('hidden');
    channelsContainer.classList.remove('hidden');
    currentCategory.textContent = categoryName || 'Categoría';
    filteredChannels = channelsData.filter(ch => ch.category_id === categoryId);
    renderChannels(filteredChannels);
  }

  // Dibuja lista de canales
  function renderChannels(channels) {
    channelsList.innerHTML = '';

    if (channels.length === 0) {
      channelsList.innerHTML = '<div class="empty-message">No hay canales en esta categoría</div>';
      return;
    }

    channels.forEach(channel => {
      const el = document.createElement('div');
      el.className = 'channel-item item';
      el.innerHTML = `
        <div class="channel-name">${channel.name}</div>
        ${channel.epg_channel_id ? `<div class="channel-number">${channel.epg_channel_id}</div>` : ''}
      `;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        playChannel(channel);
      });
      channelsList.appendChild(el);
    });
  }

  // Búsqueda local en categorías o canales
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const inCategoryView = !categoriesContainer.classList.contains('visible') && channelsContainer.classList.contains('visible');

    if (!inCategoryView) {
      const results = allCategories.filter(cat =>
        cat.category_name.toLowerCase().includes(query)
      );
      renderCategories(results);
    } else {
      const results = filteredChannels.filter(ch =>
        ch.name.toLowerCase().includes(query)
      );
      renderChannels(results);
    }
  });

  // Inicia reproducción del canal
  function playChannel(channel) {
    const streamUrl = `${server}/live/${user}/${pass}/${channel.stream_id}.ts?${Date.now()}`;

    playerContainer.classList.remove('hidden');
    playerContainer.classList.add('visible');

    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();

    // ⚠️ Esto solo inserta un `<source>`, por eso no muestra audios ni subtítulos
    videoPlayer.innerHTML = `
      <source src="${streamUrl}" type="video/mp2t">
      Tu navegador no soporta el elemento de video.
    `;

    // Limpia pistas previas
document.getElementById('audio-tracks').innerHTML = '';
document.getElementById('subtitle-tracks').innerHTML = '';
document.getElementById('audio-controls').classList.add('hidden');
document.getElementById('subtitle-controls').classList.add('hidden');

// Espera a que se cargue el video y luego muestra pistas
videoPlayer.onloadedmetadata = () => {
  const audioTracks = videoPlayer.audioTracks || [];
  const textTracks = videoPlayer.textTracks || [];

  // Audio
  if (audioTracks.length > 0) {
    const select = document.getElementById('audio-tracks');
    audioTracks.forEach((track, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = track.label || `Pista ${i + 1}`;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      for (let i = 0; i < audioTracks.length; i++) {
        audioTracks[i].enabled = i == select.value;
      }
    });
    document.getElementById('audio-controls').classList.remove('hidden');
  }

  // Subtítulos
  if (textTracks.length > 0) {
    const select = document.getElementById('subtitle-tracks');
    textTracks.forEach((track, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = track.label || track.language || `Subtítulo ${i + 1}`;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      for (let i = 0; i < textTracks.length; i++) {
        textTracks[i].mode = i == select.value ? 'showing' : 'disabled';
      }
    });
    document.getElementById('subtitle-controls').classList.remove('hidden');
  }
};


    const playPromise = videoPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => handlePlaybackError(err, streamUrl));
    }

    nowPlaying.innerHTML = `
      <i class="fas fa-play"></i>
      <strong>Reproduciendo:</strong> ${channel.name}
      <small>(${currentCategory.textContent})</small>
    `;   
    
  }

  // Si ocurre error de reproducción, intenta usar HLS.js
  function handlePlaybackError(error, url) {
    const m3u8Url = url.replace('.ts', '.m3u8');

    if (Hls.isSupported()) {
      if (hls) hls.destroy();
      hls = new Hls();
      hls.loadSource(m3u8Url);
      hls.attachMedia(videoPlayer);
      hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play());

      hls.on(Hls.Events.ERROR, (_, data) => {
        showAlert('Error al reproducir con HLS.js', 'error');
        playerContainer.classList.remove('visible');
      });
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      videoPlayer.src = m3u8Url;
      videoPlayer.play().catch(() => {
        showAlert('Reproducción no compatible.', 'error');
        playerContainer.classList.remove('visible');
      });
    } else {
      showAlert('Tu navegador no soporta este tipo de video.', 'error');
      playerContainer.classList.remove('visible');
    }
  }

  // Botón para volver desde el reproductor
  function setupEventListeners() {
    backButton.addEventListener('click', () => {
      channelsContainer.classList.add('hidden');
      categoriesContainer.classList.remove('hidden');
      playerContainer.classList.remove('visible');
    });
  } 
}
