document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, verificando sesión...');

  Auth.getCurrentAccount(account => {
    if (!account || !account.server || !account.user || !account.pass) {
      console.warn('Sesión inválida, redirigiendo al login...');
      window.location.href = '../../index.html';
      return;
    }

    console.log('Sesión válida:', account);
    iniciarLive(account.server, account.user, account.pass);
  });
});

function iniciarLive(server, user, pass) {
  console.log('Iniciando módulo Live con:', { server, user });

  // Elementos del DOM
  const categoriesContainer = document.getElementById('categories-container');
  const channelsContainer = document.getElementById('channels-container');
  const channelsList = document.getElementById('channels-list');
  const currentCategory = document.getElementById('current-category');
  const playerContainer = document.getElementById('player-container');
  const videoPlayer = document.getElementById('video-player');
  const nowPlaying = document.getElementById('now-playing');
  const backButton = document.querySelector('.back-to-categories');

  let channelsData = [];
  let currentPlaying = null;
  let history = JSON.parse(localStorage.getItem('history')) || [];
  let hls = null;

  // Cargar datos iniciales
  Promise.all([fetchCategories(), fetchChannels()])
    .then(([categories, channels]) => {
      channelsData = channels;
      renderCategories(categories);
      setupEventListeners();
    })
    .catch(error => {
      console.error('Error cargando datos:', error);
      showAlert('Error al cargar canales. Intenta más tarde.', 'error');
    });

  function fetchCategories() {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_live_categories`;
    console.log('Cargando categorías desde:', url);
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Fallo al obtener categorías');
        return res.json();
      });
  }

  function fetchChannels() {
    const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`;
    console.log('Cargando canales desde:', url);
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Fallo al obtener canales');
        return res.json();
      });
  }

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

  function showChannelsForCategory(categoryId, categoryName) {
    categoriesContainer.classList.add('hidden');
    channelsContainer.classList.remove('hidden');
    currentCategory.textContent = categoryName || 'Categoría';

    const filtered = channelsData.filter(ch => ch.category_id === categoryId);
    renderChannels(filtered);
  }

  function renderChannels(channels) {
    channelsList.innerHTML = '';

    if (channels.length === 0) {
      channelsList.innerHTML = '<div class="empty-message">No hay canales en esta categoría</div>';
      return;
    }

    channels.forEach(channel => {
      const el = document.createElement('div');
      el.className = 'channel-item';
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

  function playChannel(channel) {
    const streamUrl = `${server}/live/${user}/${pass}/${channel.stream_id}.ts?${Date.now()}`;

    playerContainer.classList.remove('hidden');
    playerContainer.classList.add('visible');

    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();

    try {
      videoPlayer.innerHTML = `
        <source src="${streamUrl}" type="video/mp2t">
        Tu navegador no soporta el elemento de video.
      `;
      const playPromise = videoPlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => handlePlaybackError(err, streamUrl));
      }

      nowPlaying.innerHTML = `
        <i class="fas fa-play"></i>
        <strong>Reproduciendo:</strong> ${channel.name}
        <small>(${currentCategory.textContent})</small>
      `;

      updateHistory(channel);
      currentPlaying = channel;
    } catch (error) {
      handlePlaybackError(error, streamUrl);
    }
  }

  function handlePlaybackError(error, url) {
    console.error('Error reproducción:', error);
    const m3u8Url = url.replace('.ts', '.m3u8');

    if (Hls.isSupported()) {
      if (hls) hls.destroy();
      hls = new Hls();
      hls.loadSource(m3u8Url);
      hls.attachMedia(videoPlayer);
      hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play());
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('HLS error:', data);
        showAlert('Error al reproducir con HLS.js', 'error');
        playerContainer.classList.remove('visible');
      });
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      videoPlayer.src = m3u8Url;
      videoPlayer.play().catch(err => {
        console.error('Error en reproducción nativa:', err);
        showAlert('Reproducción no compatible.', 'error');
        playerContainer.classList.remove('visible');
      });
    } else {
      showAlert('Tu navegador no soporta este tipo de video.', 'error');
      playerContainer.classList.remove('visible');
    }
  }

  function setupEventListeners() {
    backButton.addEventListener('click', () => {
      channelsContainer.classList.add('hidden');
      categoriesContainer.classList.remove('hidden');
      playerContainer.classList.remove('visible');
    });
  }

  function updateHistory(channel) {
    const index = history.findIndex(h => h.stream_id === channel.stream_id);
    if (index !== -1) history.splice(index, 1);

    history.unshift({
      name: channel.name,
      stream_id: channel.stream_id,
      category_name: currentCategory.textContent,
      timestamp: new Date().toISOString()
    });

    history = history.slice(0, 20);
    localStorage.setItem('history', JSON.stringify(history));
  }
}
