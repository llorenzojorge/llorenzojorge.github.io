/**
 * Recorte do three.js usado pelo atlas 3D (assets/js/modules/atlas3d.js e chevette.js).
 * O site não tem build: este arquivo só serve para gerar assets/vendor/three.min.js
 * com o que é usado, minificado. Para atualizar a versão ou incluir uma classe nova:
 *
 *   npm pack three@<versão>   (numa pasta temporária) e extraia o pacote
 *   npx esbuild scripts/vendor/three-entry.mjs --bundle --minify --format=esm \
 *     --alias:three=<pasta extraída>/package/build/three.module.js \
 *     --legal-comments=inline --outfile=assets/vendor/three.min.js
 */
export {
  AdditiveBlending, AmbientLight, BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry, Color,
  CylinderGeometry, DirectionalLight, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, Group,
  HemisphereLight, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial,
  PerspectiveCamera, SRGBColorSpace, Scene, Shape, ShapeGeometry, Sprite, SpriteMaterial, Vector3, WebGLRenderer,
} from "three";
