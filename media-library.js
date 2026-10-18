import {makeProject,validateProject} from './core.js?v=1.0.6';

// Library membership is independent of the source files used by the montage.
export const isLibraryAsset=asset=>Boolean(asset)&&asset.inLibrary!==false;

export function removeFromLibrary(assets,id){
 const asset=assets.get(id);
 if(!isLibraryAsset(asset))return false;
 asset.inLibrary=false;
 return true;
}

export function mediaRecords(project,assets){
 const used=new Set(project.clips.map(clip=>clip.assetId).filter(Boolean));
 return [...assets].filter(asset=>isLibraryAsset(asset)||used.has(asset.id))
  .map(({id,name,kind,duration,width,height,preset,file,inLibrary})=>
   ({id,name,kind,duration,width,height,preset,file,inLibrary:inLibrary!==false}));
}

export function createStartupWorkspace(savedSession){
 const project=makeProject();
 project.name='Proyecto sin título';
 let recoverySession=null;
 try{
  if(savedSession&&Array.isArray(savedSession.assets)){
   validateProject(savedSession.project);
   recoverySession=savedSession;
  }
 }catch{/* A damaged saved session must not stop the blank editor opening. */}
 return {project,assets:new Map(),recoverySession};
}
