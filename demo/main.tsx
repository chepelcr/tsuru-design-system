import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/tokens/tokens.css";
import "../src/styles/components.css";
import "./demo.css";
import {
  AvatarEditor,
  AvatarFigure,
  AvatarGarden,
  AvatarPortrait,
  AvatarSprite,
  Button,
  catalog,
  CheckIcon,
  composeAvatar,
  DEFAULT_AVATAR,
  Dropzone,
  Field,
  FileChip,
  FRAMES,
  Notice,
  PixelBanner,
  Select,
  StatusChip,
  StatusPill,
  Stepper,
  ReceiptIcon,
  CardIcon,
  StoreIcon,
  SendIcon,
  type AvatarProfile,
  type Direction,
} from "../src";

// QA page: every token-driven component and the full avatar matrix.

const directions: Direction[] = ["front", "right", "back", "left"];

function Matrix({ profile, title }: { profile: AvatarProfile; title: string }) {
  return (
    <section className="demo-block">
      <h3>{title}</h3>
      <div className="demo-matrix">
        {(["stand", "sit"] as const).map((pose) =>
          directions.map((direction) => (
            <figure key={pose + direction}>
              <div className="demo-frames">
                {Array.from({ length: FRAMES.walk }, (_, frame) => (
                  <AvatarSprite key={frame} profile={profile} direction={direction} pose={pose} motion="walk" frame={frame} scale={2} />
                ))}
              </div>
              <figcaption>
                {pose} · {direction}
              </figcaption>
            </figure>
          )),
        )}
      </div>
    </section>
  );
}

function Big() {
  const looks: [AvatarProfile, Direction][] = [
    [DEFAULT_AVATAR, "front"],
    [DEFAULT_AVATAR, "right"],
    [DEFAULT_AVATAR, "back"],
    [catalog.examples[2].profile, "front"],
    [catalog.examples[2].profile, "right"],
    [catalog.examples[1].profile, "front"],
  ];
  return (
    <div className="demo-row" style={{ background: "#e3f0c8", padding: 16 }}>
      {looks.map(([p, d], i) => (
        <AvatarSprite key={i} profile={p} direction={d} scale={6} />
      ))}
    </div>
  );
}

function App() {
  if (location.hash === "#big") return <Big />;
  const [avatar, setAvatar] = useState<AvatarProfile>(DEFAULT_AVATAR);
  const wheel: AvatarProfile = {
    ...DEFAULT_AVATAR,
    skin: "#a96d47",
    hair: { style: "bob", color: "#b8552a" },
    top: null,
    bottom: null,
    dress: { id: "midi", color: "#1f6f6b" },
    bag: { id: "crossbody", color: "#8a5a33" },
    accessories: [{ id: "earrings" }, { id: "necklace" }],
    shoes: { id: "sneakers", color: "#f4f1ea" },
    wheelchair: { enabled: true, model: "classic", color: "#2b2f36" },
  };
  return (
    <main className="demo">
      <h1 className="tsr-display">Tsuru design system</h1>
      <section className="demo-block">
        <h2>Componentes</h2>
        <div className="demo-row">
          <Button>Primario</Button>
          <Button variant="outline">Ver pedido</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="link">Explorar ferias</Button>
          <Button icon={<SendIcon />} size="lg">
            Enviar a revisión
          </Button>
        </div>
        <div className="demo-row">
          <StatusChip tone="warning">En preparación</StatusChip>
          <StatusChip tone="success">Confirmado</StatusChip>
          <StatusChip tone="pending">Pendiente</StatusChip>
          <StatusChip tone="review">En revisión</StatusChip>
          <StatusChip tone="info">Listo para retirar</StatusChip>
          <StatusChip tone="danger">Cancelado</StatusChip>
        </div>
        <div className="demo-row">
          <StatusPill tone="warning" label="Pedido" value="Pendiente" icon={<ReceiptIcon />} />
          <StatusPill tone="review" label="Pago" value="Pendiente de comprobante" icon={<CardIcon />} />
        </div>
        <div className="demo-grid">
          <Field label="Tienda" htmlFor="shop">
            <Select id="shop">
              <option>Todas las tiendas</option>
            </Select>
          </Field>
          <Dropzone accept="image/*" label="Seleccionar archivo" hint="JPG, PNG o PDF · Máximo 5 MB" onFile={() => undefined} />
          <FileChip name="comprobante_ejemplo.jpg" status="Listo para enviar" image onRemove={() => undefined} />
          <Notice>La tienda revisará el comprobante y actualizará el estado del pago.</Notice>
        </div>
        <Stepper
          label="Estado del pedido"
          steps={[
            { label: "Pedido creado", detail: "29 oct", state: "done", icon: <ReceiptIcon /> },
            { label: "Pago pendiente", detail: "Esperando tu comprobante", state: "current", icon: <CardIcon /> },
            { label: "Confirmación de la tienda", detail: "Pendiente", state: "upcoming", icon: <StoreIcon /> },
          ]}
        />
      </section>
      <section className="demo-block">
        <h2>Retratos</h2>
        <div className="demo-row">
          <AvatarPortrait profile={avatar} scale={2} />
          <AvatarGarden profile={avatar} scale={3} />
          {catalog.examples.map((e) => (
            <AvatarFigure key={e.label} profile={e.profile} scale={3} />
          ))}
        </div>
      </section>
      <section className="demo-block demo-editor">
        <PixelBanner title="Mi avatar" as="h2" />
        <AvatarEditor
          value={avatar}
          onChange={setAvatar}
          onReset={() => setAvatar(DEFAULT_AVATAR)}
          saveAction={<Button icon={<CheckIcon />}>Guardar avatar</Button>}
        />
      </section>
      <Matrix profile={avatar} title="Avatar actual: 4 direcciones × 2 poses × 6 pasos" />
      <Matrix profile={wheel} title="Vestido, bolso, cabello personalizado y silla de ruedas" />
      <p className="demo-note">Celdas del sprite: {composeAvatar(avatar).width} × {composeAvatar(avatar).height}</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
