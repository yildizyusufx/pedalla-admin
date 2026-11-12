/* Pedalla – "show password" eye button for every password field.
   Self-contained: works on the admin panel, the rider portal and the website.
   Watches the DOM, so fields rendered later (login, signup, change password) get the button too. */
(function () {
  if (window.__pdlPwToggle) return; window.__pdlPwToggle = true;
  var TXT = {
    tr: ['Şifreyi göster', 'Şifreyi gizle'],
    de: ['Passwort anzeigen', 'Passwort verbergen'],
    en: ['Show password', 'Hide password']
  };
  function txt(i) { var l = (document.documentElement.lang || 'de').slice(0, 2).toLowerCase(); return (TXT[l] || TXT.de)[i]; }
  var EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c6.4 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M2 2l20 20"/></svg>';

  var css = '.pw-wrap{position:relative;display:block;width:100%}' +
    '.pw-wrap>input{width:100%;padding-right:48px!important}' +
    '.pw-eye{position:absolute;top:0;right:0;bottom:0;width:46px;display:grid;place-items:center;border:0;background:none;padding:0;margin:0;cursor:pointer;color:inherit;opacity:.6;border-radius:0 12px 12px 0;-webkit-tap-highlight-color:transparent}' +
    '.pw-eye:hover,.pw-eye:focus-visible{opacity:1}.pw-eye:focus-visible{outline:2px solid currentColor;outline-offset:-4px}' +
    '.pw-eye svg{display:block}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  function setState(btn, input, shown) {
    input.type = shown ? 'text' : 'password';
    btn.innerHTML = shown ? EYE_OFF : EYE;
    btn.setAttribute('aria-pressed', shown ? 'true' : 'false');
    btn.setAttribute('aria-label', txt(shown ? 1 : 0)); btn.title = txt(shown ? 1 : 0);
  }
  function enhance(input) {
    if (input.dataset.pwEye) return; input.dataset.pwEye = '1';
    var wrap = document.createElement('span'); wrap.className = 'pw-wrap';
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pw-eye'; btn.tabIndex = 0;
    // inherit the input's text colour so the icon is visible in light and dark themes
    try { btn.style.color = getComputedStyle(input).color; } catch (e) {}
    setState(btn, input, false);
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep focus/caret in the field
    btn.addEventListener('click', function () {
      var shown = input.type === 'password';
      var s = input.selectionStart, en = input.selectionEnd;
      setState(btn, input, shown);
      if (document.activeElement === input) { try { input.setSelectionRange(s, en); } catch (e) {} }
    });
    // never submit the password as visible text field autofill-wise: hide again on submit
    if (input.form) input.form.addEventListener('submit', function () { setState(btn, input, false); }, true);
    wrap.appendChild(btn);
  }
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('input[type="password"]')) enhance(root);
    var list = root.querySelectorAll('input[type="password"]');
    for (var i = 0; i < list.length; i++) enhance(list[i]);
  }
  function start() {
    scan(document.body);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) for (var j = 0; j < muts[i].addedNodes.length; j++) scan(muts[i].addedNodes[j]);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
