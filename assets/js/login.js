import {login} from './core/auth.js';

const form=document.getElementById('loginForm');
const msg=document.getElementById('message');
const toggle=document.getElementById('togglePassword');
const pwd=document.getElementById('password');

if(toggle){
 toggle.onclick=()=>pwd.type=pwd.type==='password'?'text':'password';
}

form?.addEventListener('submit',async(e)=>{
 e.preventDefault();
 msg.textContent='Connexion...';
 const email=document.getElementById('email').value.trim();
 const password=pwd.value;

 const {data,error}=await login(email,password);

 if(error){
   msg.textContent=error.message;
   return;
 }

 msg.textContent='Connexion réussie...';
 window.location.replace('dashboard.html');
});
