class Player {
  constructor() {
    // Elementos del DOM
    this.videoPlayer = document.getElementById('video-player');
    this.nowPlaying = document.getElementById('now-playing');
    this.playerContainer = document.getElementById('player-container');
    this.audioTracksBtn = document.getElementById('audio-track-btn');
    this.subtitlesBtn = document.getElementById('subtitle-btn');
    this.audioTracksMenu = document.getElementById('audio-tracks-menu');
    this.subtitlesMenu = document.getElementById('subtitles-menu');
    
    // Estado del reproductor
    this.currentContent = null;
    this.isFullscreen = false;
    this.currentAudioTrack = 0;
    this.currentSubtitleTrack = -1; // -1 = subtítulos desactivados
    this.availableTracks = {
      audio: [],
      subtitles: []
    };
    
    // Inicializar eventos
    this.initPlayerEvents();
  }

  // Inicializar eventos del reproductor
  initPlayerEvents() {
    if (this.videoPlayer) {
      this.videoPlayer.addEventListener('error', (e) => this.handlePlayerError(e));
      this.videoPlayer.addEventListener('play', () => this.onPlay());
      this.videoPlayer.addEventListener('pause', () => this.onPause());
      this.videoPlayer.addEventListener('loadedmetadata', () => this.setupMediaTracks());
    }

    // Eventos para controles de audio y subtítulos
    if (this.audioTracksBtn) {
      this.audioTracksBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audioTracksMenu.classList.toggle('hidden');
        this.subtitlesMenu.classList.add('hidden');
      });
    }

    if (this.subtitlesBtn) {
      this.subtitlesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.subtitlesMenu.classList.toggle('hidden');
        this.audioTracksMenu.classList.add('hidden');
      });
    }

    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', () => {
      this.audioTracksMenu.classList.add('hidden');
      this.subtitlesMenu.classList.add('hidden');
    });
  }

  // Manejar errores del reproductor
  handlePlayerError(event) {
    const error = this.videoPlayer.error;
    let message = 'Error desconocido al reproducir el contenido';
    
    const errorMessages = {
      1: 'Reproducción cancelada',
      2: 'Error de red. Verifica tu conexión',
      3: 'Error al decodificar el video',
      4: 'Formato no soportado o URL inválida'
    };
    
    message = errorMessages[error.code] || message;
    this.showAlert(message, 'error');
    console.error('Error en el reproductor:', error, 'Evento:', event);
  }

  // Evento play
  onPlay() {
    this.playerContainer?.classList.add('is-playing');
  }

  // Evento pause
  onPause() {
    this.playerContainer?.classList.remove('is-playing');
  }

  // Configurar pistas de audio y subtítulos
  setupMediaTracks() {
    this.clearTracks();
    this.setupAudioTracks();
    this.setupSubtitles();
  }

  // Configurar pistas de audio
  setupAudioTracks() {
    const audioTracks = this.videoPlayer.audioTracks;
    this.availableTracks.audio = [];
    this.audioTracksMenu.innerHTML = '';

    for (let i = 0; i < audioTracks.length; i++) {
      const track = audioTracks[i];
      this.availableTracks.audio.push(track);
      
      const trackItem = document.createElement('div');
      trackItem.className = 'track-item';
      trackItem.textContent = track.language || `Audio ${i + 1}`;
      trackItem.addEventListener('click', () => this.setAudioTrack(i));
      
      this.audioTracksMenu.appendChild(trackItem);
    }

    // Activar la primera pista por defecto
    if (this.availableTracks.audio.length > 0) {
      this.setAudioTrack(0);
    }
  }

  // Configurar subtítulos
  setupSubtitles() {
    const textTracks = this.videoPlayer.textTracks;
    this.availableTracks.subtitles = [];
    this.subtitlesMenu.innerHTML = '';

    // Opción para desactivar subtítulos
    const noneItem = document.createElement('div');
    noneItem.className = 'track-item';
    noneItem.textContent = 'Subtítulos: Desactivados';
    noneItem.addEventListener('click', () => this.setSubtitleTrack(-1));
    this.subtitlesMenu.appendChild(noneItem);

    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      this.availableTracks.subtitles.push(track);
      
      const trackItem = document.createElement('div');
      trackItem.className = 'track-item';
      trackItem.textContent = track.label || `Subtítulos ${i + 1}`;
      trackItem.addEventListener('click', () => this.setSubtitleTrack(i));
      
      this.subtitlesMenu.appendChild(trackItem);
    }

    this.updateTrackSelection();
  }

  // Establecer pista de audio
  setAudioTrack(index) {
    if (index >= 0 && index < this.availableTracks.audio.length) {
      this.availableTracks.audio.forEach((track, i) => {
        track.enabled = (i === index);
      });
      this.currentAudioTrack = index;
      this.updateTrackSelection();
    }
  }

  // Establecer pista de subtítulos
  setSubtitleTrack(index) {
    this.availableTracks.subtitles.forEach((track, i) => {
      track.mode = (i === index) ? 'showing' : 'hidden';
    });
    this.currentSubtitleTrack = index;
    this.updateTrackSelection();
  }

  // Actualizar selección de pistas en la UI
  updateTrackSelection() {
    const audioItems = this.audioTracksMenu.querySelectorAll('.track-item');
    const subtitleItems = this.subtitlesMenu.querySelectorAll('.track-item');
    
    audioItems.forEach((item, i) => {
      item.classList.toggle('active', i === this.currentAudioTrack);
    });
    
    subtitleItems.forEach((item, i) => {
      const isActive = (i === 0 && this.currentSubtitleTrack === -1) || 
                       (i === this.currentSubtitleTrack + 1);
      item.classList.toggle('active', isActive);
    });
  }

  // Limpiar pistas
  clearTracks() {
    this.availableTracks = { audio: [], subtitles: [] };
    if (this.videoPlayer) {
      Array.from(this.videoPlayer.children).forEach(child => {
        if (child.tagName === 'TRACK') {
          this.videoPlayer.removeChild(child);
        }
      });
    }
  }

  // Reproducir contenido
  play(content) {
    try {
      if (!content || !content.stream_url) {
        throw new Error('No se proporcionó contenido válido para reproducir');
      }
      
      this.currentContent = content;
      this.updateNowPlaying(content);
      
      // Resetear el reproductor
      this.videoPlayer.pause();
      this.videoPlayer.src = content.stream_url;
      this.videoPlayer.load();
      
      const playPromise = this.videoPlayer.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          this.showAlert(`Error al reproducir: ${err.message}`, 'error');
          console.error('Error en play():', err);
        });
      }
      
    } catch (error) {
      this.showAlert(`Error: ${error.message}`, 'error');
      console.error('Error en Player.play():', error);
    }
  }

  // Actualizar información de reproducción
  updateNowPlaying(content) {
    if (this.nowPlaying) {
      this.nowPlaying.innerHTML = `
        <i class="fas fa-${content.type === 'movie' ? 'film' : 'tv'}"></i>
        <strong>${content.name}</strong>
        ${content.category_name ? `<small>${content.category_name}</small>` : ''}
        ${content.year ? `<small>• ${content.year}</small>` : ''}
      `;
    }
  }

  // Mostrar notificación
  showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <i class="fas fa-${this.getAlertIcon(type)}"></i>
      <span>${message}</span>
      <button onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
  }

  // Obtener icono para alertas
  getAlertIcon(type) {
    const icons = {
      error: 'exclamation-circle',
      success: 'check-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }

  // Métodos de control del reproductor
  pause() {
    this.videoPlayer?.pause();
  }

  togglePlay() {
    this.videoPlayer?.paused ? this.videoPlayer.play() : this.videoPlayer.pause();
  }

  toggleFullscreen() {
    if (!this.isFullscreen) {
      const container = this.playerContainer;
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      this.isFullscreen = false;
    }
  }

  // Cargar subtítulos externos
  loadSubtitles(url, language = 'es', label = 'Español') {
    if (!this.videoPlayer) return;
    
    // Eliminar tracks anteriores del mismo idioma
    Array.from(this.videoPlayer.textTracks).forEach(track => {
      if (track.srclang === language) {
        track.mode = 'disabled';
      }
    });
    
    // Crear nuevo track
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.src = url;
    track.srclang = language;
    track.label = label;
    this.videoPlayer.appendChild(track);
    
    // Actualizar menú de subtítulos
    this.setupSubtitles();
  }
}

// Exportar instancia del reproductor
const playerInstance = new Player();