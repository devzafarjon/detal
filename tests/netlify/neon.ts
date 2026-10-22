export const neon=()=>({query:async(sql:string,params:any[]) => (await (globalThis as any).testPostgres.query(sql,params)).rows});
