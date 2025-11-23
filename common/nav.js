// Common top navigation for all DSL pages
(function(){
  const inject = () => {
    try{
      document.body.classList.add('has-top-nav');
      const nav = document.createElement('nav');
      nav.className = 'top-nav';
      const path = location.pathname.replace(/index\.html$/i, '/');
      const links = [
        { href: '/', label: 'Home' },
        { href: '/edit.html', label: 'Editor' },
        { href: '/manager.html', label: 'Manager' },
        { href: '/config', label: 'Config' },
        { href: '/integrations-demo.html', label: 'Integracje' },
        { href: '/ui-tester.html', label: 'UI Tester' },
        { href: '/test-runner.html', label: 'Testy' },
        { href: '/api', label: 'API' }
      ];
      const isActive = (href) => {
        if (href === '/') return path === '/' || path === '';
        return path === href;
      };
      nav.innerHTML = `
        <div class="nav-inner">
          <div class="brand"><a href="/">DSL</a></div>
          <div class="nav-links">
            ${links.map(l => `<a class="nav-link${isActive(l.href)?' active':''}" href="${l.href}">${l.label}</a>`).join('')}
          </div>
          <div class="right">
            <a class="nav-link" href="/docs/README.md" target="_blank">Docs</a>
            <span class="sep">|</span>
            <a class="nav-link" href="/config">Konfiguracja</a>
          </div>
        </div>`;
      document.body.prepend(nav);
    }catch(e){ /* ignore */ }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
