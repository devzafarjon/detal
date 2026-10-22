import {isOwner} from '../../../lib/catalog-access';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({admin:await isOwner()},{headers:{'Cache-Control':'private, no-store'}})}
