class Favorites {
    static addFavorite(item) {
      const favorites = this.getFavorites();
      if (!favorites.some(fav => fav.id === item.id)) {
        favorites.push(item);
        localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
      }
    }
  
    static removeFavorite(id) {
      const favorites = this.getFavorites().filter(fav => fav.id !== id);
      localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
    }
  
    static getFavorites() {
      return JSON.parse(localStorage.getItem('iptv_favorites') || '[]');
    }
  
    static isFavorite(id) {
      return this.getFavorites().some(fav => fav.id === id);
    }
  }
  
  class History {
    static addToHistory(item) {
      const history = this.getHistory();
      // Eliminar si ya existe
      const filtered = history.filter(h => h.id !== item.id);
      // Agregar al inicio
      filtered.unshift(item);
      // Mantener solo los últimos 50
      const limited = filtered.slice(0, 50);
      localStorage.setItem('iptv_history', JSON.stringify(limited));
    }
  
    static getHistory() {
      return JSON.parse(localStorage.getItem('iptv_history') || '[]');
    }
  
    static clearHistory() {
      localStorage.removeItem('iptv_history');
    }
  }