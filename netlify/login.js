const error=new URLSearchParams(location.search).get('error');
document.getElementById('error').textContent=error==='limit'?'Ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring.':error?'Email yoki parol noto‘g‘ri. Tekshirib, qayta urinib ko‘ring.':'';
document.getElementById('togglePassword').onclick=()=>{const field=document.getElementById('password'),button=document.getElementById('togglePassword'),show=field.type==='password';field.type=show?'text':'password';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',show?'Parolni yashirish':'Parolni ko‘rsatish');};
document.querySelector('form').addEventListener('submit',()=>{const button=document.getElementById('loginSubmit');button.disabled=true;button.textContent='Kirilmoqda…';});
window.addEventListener('pageshow',()=>{const button=document.getElementById('loginSubmit');button.disabled=false;button.innerHTML='Hisobga kirish'+uiIcon('chevron');});
