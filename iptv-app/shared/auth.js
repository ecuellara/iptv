const isWebOS = (() => {
  try {
    return typeof webOS !== 'undefined' && typeof webOS.service !== 'undefined';
  } catch (e) {
    return false;
  }
})();  
  
class Auth {
  static login(server, user, pass, callback) {
    const accountData = {
      server: server,
      user: user,
      pass: pass,
      lastLogin: new Date().toISOString()
    };

    // Guardar en sessionStorage para acceso inmediato
    sessionStorage.setItem('iptv_server', server);
    sessionStorage.setItem('iptv_user', user);
    sessionStorage.setItem('iptv_pass', pass);

    // Guardar en localStorage como fallback universal
    try {
      localStorage.setItem('iptv_account', JSON.stringify(accountData));
      console.log('Credenciales guardadas en localStorage');
      if (callback) callback(true);
    } catch (e) {
      console.error("Error al guardar credenciales:", e);
      if (callback) callback(false);
    }
  }

  static getCurrentAccount(callback) {
    // Primero verificar sessionStorage
    const sessionAccount = {
      server: sessionStorage.getItem('iptv_server'),
      user: sessionStorage.getItem('iptv_user'),
      pass: sessionStorage.getItem('iptv_pass')
    };

    if (sessionAccount.user) {
      if (callback) callback(sessionAccount);
      return;
    }

    // Luego verificar localStorage
    try {
      const account = JSON.parse(localStorage.getItem('iptv_account') || 'null');
      if (account && account.user) {
        // Actualizar sessionStorage
        sessionStorage.setItem('iptv_server', account.server);
        sessionStorage.setItem('iptv_user', account.user);
        sessionStorage.setItem('iptv_pass', account.pass);
      }
      if (callback) callback(account);
    } catch (e) {
      console.error("Error al obtener cuenta:", e);
      if (callback) callback(null);
    }
  }

  static logout(callback) {
    // Limpiar ambos storages
    sessionStorage.removeItem('iptv_server');
    sessionStorage.removeItem('iptv_user');
    sessionStorage.removeItem('iptv_pass');
    
    try {
      localStorage.removeItem('iptv_account');
      if (callback) callback(true);
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
      if (callback) callback(false);
    }
  }

  static getSavedAccounts(callback) {
    try {
      const accounts = JSON.parse(localStorage.getItem('iptv_saved_accounts') || '[]');
      if (callback) callback(accounts);
    } catch (e) {
      console.error("Error al obtener cuentas guardadas:", e);
      if (callback) callback([]);
    }
  }

  static saveAccount(account, callback) {
    this.getSavedAccounts((existingAccounts) => {
      const accounts = existingAccounts.filter(acc => 
        acc.server !== account.server || acc.user !== account.user
      );
      accounts.unshift(account);
      
      try {
        localStorage.setItem('iptv_saved_accounts', JSON.stringify(accounts.slice(0, 2)));
        if (callback) callback(true);
      } catch (e) {
        console.error("Error al guardar cuenta:", e);
        if (callback) callback(false);
      }
    });
  }
}
