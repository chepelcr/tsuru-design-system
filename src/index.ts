// @chepelcr/tsuru-design-system — shared by Tsuru Account and the virtual fairs.
// Import the styles once per app: `import "@chepelcr/tsuru-design-system/styles.css"`.

export * from "./tokens/tokens";
export * from "./pixel/raster";
export { PixelCanvas } from "./pixel/PixelCanvas";

export * from "./components/primitives";
export * from "./components/choice";
export * from "./components/upload";
export * from "./components/game";
export * from "./components/icons";

export * from "./avatar/schema";
export {
  composeAvatar,
  cropSprite,
  drawAvatar,
  drawCentered,
  ALL_LAYERS,
  FRAMES,
  INK,
  SPRITE_SIZE,
  type Cells,
  type ComposeOptions,
  type Layer,
  type Sprite,
  type View,
} from "./avatar/compose";
export { drawStage, drawPortrait, drawGarden, drawBannerSide, STAGE_SIZE, PORTRAIT_SIZE, GARDEN_SIZE } from "./avatar/scene";
export {
  AvatarSprite,
  AvatarPortrait,
  AvatarGarden,
  AvatarStage,
  AvatarFigure,
  DIRECTIONS,
  useFrame,
  useReducedMotion,
} from "./avatar/components";
export { AvatarEditor, type EditorCategory } from "./avatar/AvatarEditor";
