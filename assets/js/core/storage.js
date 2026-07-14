/**
 * storage.js
 */
export const Storage={
 set(key,value,persistent=true){
  const data=JSON.stringify(value);
  (persistent?localStorage:sessionStorage).setItem(key,data);
 },
 get(key,persistent=true){
  const raw=(persistent?localStorage:sessionStorage).getItem(key);
  if(!raw) return null;
  try{return JSON.parse(raw);}catch{return raw;}
 },
 remove(key,persistent=true){
  (persistent?localStorage:sessionStorage).removeItem(key);
 },
 clear(persistent=true){
  (persistent?localStorage:sessionStorage).clear();
 }
};
