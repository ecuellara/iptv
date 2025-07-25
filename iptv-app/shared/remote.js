document.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement;
    
    switch(e.key) {
      case 'ArrowUp':
        navigate('up');
        e.preventDefault();
        break;
      case 'ArrowDown':
        navigate('down');
        e.preventDefault();
        break;
      case 'ArrowLeft':
        navigate('left');
        e.preventDefault();
        break;
      case 'ArrowRight':
        navigate('right');
        e.preventDefault();
        break;
      case 'Enter':
        if (activeElement && activeElement.click) activeElement.click();
        e.preventDefault();
        break;
      case 'Backspace':
      case 'Escape':
        const backBtn = document.querySelector('.back-button');
        if (backBtn && backBtn.click) backBtn.click();
        e.preventDefault();
        break;
    }
  });
  
  function navigate(direction) {
    const focusable = Array.from(document.querySelectorAll('button, a, input, [tabindex]:not([tabindex="-1"])'));
    const currentIndex = focusable.indexOf(document.activeElement);
    
    if (direction === 'up' || direction === 'left') {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1;
      focusable[prevIndex].focus();
    } else {
      const nextIndex = currentIndex < focusable.length - 1 ? currentIndex + 1 : 0;
      focusable[nextIndex].focus();
    }
  }