/**
 * The 3D dog model. Drop the exported GLB at public/models/dog.glb.
 * Until it exists, a simple built-in placeholder dog is shown instead.
 */
export const DOG_MODEL = {
  url: '/models/dog.glb',
  /** Turn the model to face the camera if the exporter faced it elsewhere (radians). */
  rotationY: 0,
  /** Height the model is scaled to, in scene units. */
  targetHeight: 1.6,
};
