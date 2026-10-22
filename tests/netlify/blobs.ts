const values=new Map<string,{data:ArrayBuffer,metadata:any}>();
export const getStore=()=>({
 async set(key:string,data:any,options:any={}){const bytes=typeof data==='string'?new TextEncoder().encode(data):new Uint8Array(data);values.set(key,{data:bytes.slice().buffer,metadata:options.metadata||{}});return {modified:true};},
 async get(key:string,options:any={}){const v=values.get(key);if(!v)return null;return options.type==='arrayBuffer'?v.data:options.type==='json'?JSON.parse(new TextDecoder().decode(v.data)):new TextDecoder().decode(v.data);},
 async getWithMetadata(key:string){return values.get(key)||null;},
 async getMetadata(key:string){const v=values.get(key);return v?{metadata:v.metadata}:null;},
 async delete(key:string){values.delete(key);},
});
