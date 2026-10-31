import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PixelCanvas } from "../pixel/PixelCanvas";
import { Button } from "../components/primitives";
import { CategoryTabs, ChoiceGroup, OptionTile, RangeField, SwatchRow } from "../components/choice";
import { EyeIcon, ResetIcon } from "../components/icons";
import { AvatarFigure, AvatarStage, DIRECTIONS, useReducedMotion } from "./components";
import { composeAvatar, cropSprite, HEAD_ROWS, type Layer, type Sprite } from "./compose";
import { catalog, pieceColor, type AvatarProfile, type Direction, type Hex, type Piece, type Slot } from "./schema";

// The avatar editor from the approved sketch 03: categories and skin tone on the
// left, the avatar on its paved tile in the middle (it can be turned around) with
// example looks below, the options on the right and the actions at the bottom.
// It is controlled: the parent owns the profile, saving and resetting, so the
// same editor serves Account today and the fair's entrance later.

export type EditorCategory = "appearance" | "hair" | "clothes" | "bags" | "accessories" | "wheelchair";

const CATEGORIES: { id: EditorCategory; label: string }[] = [
  { id: "appearance", label: "Apariencia" },
  { id: "hair", label: "Cabello" },
  { id: "clothes", label: "Ropa" },
  { id: "bags", label: "Bolsos" },
  { id: "accessories", label: "Accesorios" },
  { id: "wheelchair", label: "Silla de ruedas" },
];

const THUMB = 64;

function Thumb({ sprite, box = THUMB }: { sprite: Sprite; box?: number }) {
  const scale = Math.max(1, Math.min(4, Math.floor(box / Math.max(sprite.width, sprite.height))));
  return <PixelCanvas width={sprite.width} height={sprite.height} scale={scale} draw={(r) => r.grid(sprite.cells, 0, 0)} />;
}

const head = (sprite: Sprite): Sprite => {
  const cells = sprite.cells.slice(0, HEAD_ROWS);
  return cropSprite({ ...sprite, cells, height: cells.length });
};

const thumbOf = (profile: AvatarProfile, layers: Layer[], options: { direction?: Direction; headOnly?: boolean } = {}) => {
  const sprite = composeAvatar(profile, { layers, direction: options.direction });
  return options.headOnly ? head(sprite) : cropSprite(sprite);
};

function NoneArt() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function AvatarEditor({
  value,
  onChange,
  onReset,
  saveAction,
  status,
  title = "Mi avatar",
}: {
  value: AvatarProfile;
  onChange: (next: AvatarProfile) => void;
  onReset: () => void;
  /** The save button (the parent knows how and where to save). */
  saveAction: ReactNode;
  /** A live message area: saved, conflict, error. */
  status?: ReactNode;
  title?: string;
}) {
  const [category, setCategory] = useState<EditorCategory>("appearance");
  const [direction, setDirection] = useState<Direction>("front");
  const [preview, setPreview] = useState(false);
  const [accessoryFocus, setAccessoryFocus] = useState<string | null>(null);
  const reduced = useReducedMotion();
  // The preview walks and turns around, so every direction can be checked.
  useEffect(() => {
    if (!preview || reduced) return;
    const id = window.setInterval(() => setDirection((d) => DIRECTIONS[(DIRECTIONS.indexOf(d) + 1) % DIRECTIONS.length]), 2400);
    return () => window.clearInterval(id);
  }, [preview, reduced]);
  const set = (patch: Partial<AvatarProfile>) => onChange({ ...value, ...patch });
  const piece = (slot: Slot, id: string, current?: Piece | null): Piece => ({
    id,
    color: (current?.id === id && current.color) || (catalog.slots[slot].find((i) => i.id === id)?.color as Hex),
  });

  const choose = (next: EditorCategory) => {
    setCategory(next);
    document.getElementById(`tsr-panel-${next}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const accessoryIds = value.accessories.map((a) => a.id);
  const toggleAccessory = (id: string) => {
    const group = catalog.slots.accessory.find((a) => a.id === id)?.group;
    if (accessoryIds.includes(id)) {
      set({ accessories: value.accessories.filter((a) => a.id !== id) });
      if (accessoryFocus === id) setAccessoryFocus(null);
      return;
    }
    const kept = value.accessories.filter((a) => catalog.slots.accessory.find((i) => i.id === a.id)?.group !== group);
    if (kept.length >= catalog.limits.accessories) return;
    set({ accessories: [...kept, piece("accessory", id)] });
    setAccessoryFocus(id);
  };
  const focused = value.accessories.find((a) => a.id === accessoryFocus && catalog.slots.accessory.find((i) => i.id === a.id)?.tint);

  // Thumbnails reuse the person's own skin and colours, so they preview the result.
  const thumbs = useMemo(() => {
    const base: AvatarProfile = { ...value, accessories: [], bag: null };
    return {
      facial: catalog.slots.facial_hair.map((f) => thumbOf({ ...base, facial_hair: f.id }, ["body", "face", "hair", "facial_hair"], { headOnly: true })),
      hair: catalog.slots.hair.map((h) => thumbOf({ ...base, hair: { ...value.hair, style: h.id } }, ["body", "face", "hair", "facial_hair"], { headOnly: true })),
      top: catalog.slots.top.map((t) => thumbOf({ ...base, dress: null, top: piece("top", t.id, value.top), bottom: value.bottom ?? piece("bottom", "jeans") }, ["top"])),
      bottom: catalog.slots.bottom.map((b) => thumbOf({ ...base, dress: null, top: value.top ?? piece("top", "tee"), bottom: piece("bottom", b.id, value.bottom), wheelchair: { ...value.wheelchair, enabled: false } }, ["bottom"])),
      dress: catalog.slots.dress.map((d) => thumbOf({ ...base, top: null, bottom: null, dress: piece("dress", d.id, value.dress), wheelchair: { ...value.wheelchair, enabled: false } }, ["dress"])),
      bag: catalog.slots.bag.map((b) => thumbOf({ ...base, bag: piece("bag", b.id, value.bag), wheelchair: { ...value.wheelchair, enabled: false } }, ["bag"], { direction: b.id === "backpack" ? "back" : "front" })),
      accessory: catalog.slots.accessory.map((a) => thumbOf({ ...base, accessories: [value.accessories.find((x) => x.id === a.id) ?? piece("accessory", a.id)] }, ["accessories"], { direction: "front" })),
      chair: catalog.slots.wheelchair.map((w) => thumbOf({ ...base, wheelchair: { enabled: true, model: w.id, color: value.wheelchair.color } }, ["wheelchair"], { direction: "right" })),
    };
  }, [value]);

  const panel = (id: EditorCategory, heading: string, children: ReactNode) => (
    <section
      id={`tsr-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tsr-tab-${id}`}
      className={["tsr-editor__panel", category === id ? "is-active" : ""].join(" ")}
    >
      <h3>{heading}</h3>
      {children}
    </section>
  );

  return (
    <div className="tsr-editor-host">
    <div className="tsr-editor">
      <div className="tsr-editor__left">
        <CategoryTabs items={CATEGORIES} value={category} onChange={choose} label="Partes del avatar" />
        <div className="tsr-editor__skin tsr-card">
          <SwatchRow
            name="avatar-skin"
            legend="Tono de piel"
            colors={catalog.skin_tones}
            value={value.skin}
            onChange={(skin) => set({ skin: skin as Hex })}
          />
        </div>
      </div>

      <div className="tsr-editor__center">
        <h2 className="tsr-visually-hidden">{title}</h2>
        <AvatarStage
          profile={value}
          direction={direction}
          onDirectionChange={setDirection}
          motion={preview ? "walk" : "idle"}
        />
        <div className="tsr-editor__examples tsr-card">
          <h3>Otros ejemplos de avatares</h3>
          <div className="tsr-editor__example-list">
            {catalog.examples.map((example) => (
              <button
                key={example.label}
                type="button"
                className="tsr-example"
                onClick={() => onChange(structuredClone(example.profile))}
                aria-label={`Usar el ejemplo: ${example.label}`}
                title={example.label}
              >
                <AvatarFigure profile={example.profile} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tsr-editor__right">
        {panel(
          "appearance",
          "Apariencia",
          <>
            <RangeField
              id="avatar-height"
              label="Altura"
              {...catalog.proportions.height}
              value={value.height}
              onChange={(height) => set({ height })}
            />
            <RangeField
              id="avatar-weight"
              label="Peso"
              {...catalog.proportions.weight}
              value={value.weight}
              onChange={(weight) => set({ weight })}
            />
            <ChoiceGroup legend="Vello facial">
              {catalog.slots.facial_hair.map((f, i) => (
                <OptionTile key={f.id} name="avatar-facial" value={f.id} label={f.label} checked={value.facial_hair === f.id} onSelect={() => set({ facial_hair: f.id })}>
                  <Thumb sprite={thumbs.facial[i]} />
                </OptionTile>
              ))}
            </ChoiceGroup>
          </>,
        )}
        {panel(
          "hair",
          "Cabello y color",
          <>
            <ChoiceGroup legend="Estilo de cabello" hideLegend>
              {catalog.slots.hair.map((h, i) => (
                <OptionTile key={h.id} name="avatar-hair" value={h.id} label={h.label} checked={value.hair.style === h.id} onSelect={() => set({ hair: { ...value.hair, style: h.id } })}>
                  <Thumb sprite={thumbs.hair[i]} />
                </OptionTile>
              ))}
            </ChoiceGroup>
            <SwatchRow
              name="avatar-hair-color"
              legend="Color del cabello"
              hideLegend
              colors={catalog.hair_colors}
              value={value.hair.color}
              onChange={(color) => set({ hair: { ...value.hair, color: color as Hex } })}
            />
          </>,
        )}
        {panel(
          "clothes",
          "Ropa",
          <>
            <ChoiceGroup legend="Prenda superior">
              {catalog.slots.top.map((t, i) => (
                <OptionTile
                  key={t.id}
                  name="avatar-top"
                  value={t.id}
                  label={t.label}
                  checked={!value.dress && value.top?.id === t.id}
                  onSelect={() => set({ dress: null, top: piece("top", t.id, value.top), bottom: value.bottom ?? piece("bottom", "jeans") })}
                >
                  <Thumb sprite={thumbs.top[i]} />
                </OptionTile>
              ))}
            </ChoiceGroup>
            {value.top && !value.dress ? (
              <SwatchRow
                name="avatar-top-color"
                legend="Color de la prenda superior"
                hideLegend
                colors={catalog.swatches}
                value={pieceColor("top", value.top)}
                onChange={(color) => set({ top: { ...value.top!, color: color as Hex } })}
              />
            ) : null}
            <ChoiceGroup legend="Prenda inferior">
              {catalog.slots.bottom.map((b, i) => (
                <OptionTile
                  key={b.id}
                  name="avatar-bottom"
                  value={b.id}
                  label={b.label}
                  checked={!value.dress && value.bottom?.id === b.id}
                  onSelect={() => set({ dress: null, bottom: piece("bottom", b.id, value.bottom), top: value.top ?? piece("top", "tee") })}
                >
                  <Thumb sprite={thumbs.bottom[i]} />
                </OptionTile>
              ))}
            </ChoiceGroup>
            {value.bottom && !value.dress ? (
              <SwatchRow
                name="avatar-bottom-color"
                legend="Color de la prenda inferior"
                hideLegend
                colors={catalog.swatches}
                value={pieceColor("bottom", value.bottom)}
                onChange={(color) => set({ bottom: { ...value.bottom!, color: color as Hex } })}
              />
            ) : null}
            <ChoiceGroup legend="Vestidos">
              {catalog.slots.dress.map((d, i) => (
                <OptionTile
                  key={d.id}
                  name="avatar-dress"
                  value={d.id}
                  label={d.label}
                  checked={value.dress?.id === d.id}
                  onSelect={() => set({ dress: piece("dress", d.id, value.dress), top: null, bottom: null })}
                >
                  <Thumb sprite={thumbs.dress[i]} />
                </OptionTile>
              ))}
            </ChoiceGroup>
            {value.dress ? (
              <SwatchRow
                name="avatar-dress-color"
                legend="Color del vestido"
                hideLegend
                colors={catalog.swatches}
                value={pieceColor("dress", value.dress)}
                onChange={(color) => set({ dress: { ...value.dress!, color: color as Hex } })}
              />
            ) : null}
            <ChoiceGroup legend="Calzado">
              {catalog.slots.shoes.map((s) => (
                <OptionTile key={s.id} name="avatar-shoes" value={s.id} label={s.label} checked={value.shoes.id === s.id} onSelect={() => set({ shoes: piece("shoes", s.id, value.shoes) })}>
                  <Thumb sprite={thumbOf({ ...value, shoes: piece("shoes", s.id, value.shoes), wheelchair: { ...value.wheelchair, enabled: false } }, ["shoes"])} box={40} />
                </OptionTile>
              ))}
            </ChoiceGroup>
            <SwatchRow
              name="avatar-shoes-color"
              legend="Color del calzado"
              hideLegend
              colors={catalog.swatches}
              value={pieceColor("shoes", value.shoes)}
              onChange={(color) => set({ shoes: { ...value.shoes, color: color as Hex } })}
            />
          </>,
        )}
        {panel(
          "bags",
          "Bolsos",
          <>
            <ChoiceGroup legend="Bolso" hideLegend>
              <OptionTile name="avatar-bag" value="none" label="Sin bolso" checked={!value.bag} onSelect={() => set({ bag: null })}>
                <NoneArt />
              </OptionTile>
              {catalog.slots.bag.map((b, i) => (
                <OptionTile key={b.id} name="avatar-bag" value={b.id} label={b.label} checked={value.bag?.id === b.id} onSelect={() => set({ bag: piece("bag", b.id, value.bag) })}>
                  <Thumb sprite={thumbs.bag[i]} />
                </OptionTile>
              ))}
            </ChoiceGroup>
            {value.bag ? (
              <SwatchRow
                name="avatar-bag-color"
                legend="Color del bolso"
                hideLegend
                colors={catalog.swatches}
                value={pieceColor("bag", value.bag)}
                onChange={(color) => set({ bag: { ...value.bag!, color: color as Hex } })}
              />
            ) : null}
          </>,
        )}
        {panel(
          "accessories",
          "Accesorios",
          <>
            <ChoiceGroup legend={`Accesorios (hasta ${catalog.limits.accessories}, uno por zona)`} hideLegend>
              {catalog.slots.accessory.map((a, i) => (
                <OptionTile
                  key={a.id}
                  name="avatar-accessories"
                  value={a.id}
                  label={a.label}
                  multiple
                  checked={accessoryIds.includes(a.id)}
                  onSelect={() => toggleAccessory(a.id)}
                >
                  <Thumb sprite={thumbs.accessory[i]} />
                </OptionTile>
              ))}
            </ChoiceGroup>
            {focused ? (
              <SwatchRow
                name="avatar-accessory-color"
                legend={`Color: ${catalog.slots.accessory.find((a) => a.id === focused.id)?.label}`}
                colors={catalog.swatches}
                value={pieceColor("accessory", focused)}
                onChange={(color) =>
                  set({ accessories: value.accessories.map((a) => (a.id === focused.id ? { ...a, color: color as Hex } : a)) })
                }
              />
            ) : null}
          </>,
        )}
        {panel(
          "wheelchair",
          "Silla de ruedas",
          <>
            <ChoiceGroup legend="Silla de ruedas" hideLegend>
              <OptionTile
                name="avatar-chair"
                value="none"
                label="Sin silla"
                checked={!value.wheelchair.enabled}
                onSelect={() => set({ wheelchair: { ...value.wheelchair, enabled: false } })}
              >
                <NoneArt />
              </OptionTile>
              {catalog.slots.wheelchair.map((w, i) => (
                <OptionTile
                  key={w.id}
                  name="avatar-chair"
                  value={w.id}
                  label={w.label}
                  checked={value.wheelchair.enabled && value.wheelchair.model === w.id}
                  onSelect={() => set({ wheelchair: { ...value.wheelchair, enabled: true, model: w.id } })}
                >
                  <Thumb sprite={thumbs.chair[i]} />
                </OptionTile>
              ))}
            </ChoiceGroup>
            {value.wheelchair.enabled ? (
              <SwatchRow
                name="avatar-chair-color"
                legend="Color de la silla"
                hideLegend
                colors={catalog.wheelchair_colors}
                value={value.wheelchair.color}
                onChange={(color) => set({ wheelchair: { ...value.wheelchair, color: color as Hex } })}
              />
            ) : null}
            <p className="tsr-editor__note">Es una elección de apariencia: no cambia la velocidad ni el acceso en las ferias.</p>
          </>,
        )}
      </div>

      <div className="tsr-editor__footer">
        {status ? <div className="tsr-editor__status">{status}</div> : null}
        <div className="tsr-editor__actions">
          <Button variant="outline" icon={<ResetIcon />} onClick={onReset}>
            Restablecer
          </Button>
          <Button variant="outline" icon={<EyeIcon />} aria-pressed={preview} onClick={() => setPreview((p) => !p)}>
            {preview ? "Detener vista previa" : "Vista previa"}
          </Button>
          {saveAction}
        </div>
      </div>
    </div>
    </div>
  );
}
