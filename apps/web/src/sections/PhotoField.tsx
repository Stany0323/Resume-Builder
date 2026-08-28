import { useRef, useState } from "react";
import type { ResumeDocument } from "@resume-builder/core";

type Photo = NonNullable<ResumeDocument["personal"]["photo"]>;
type UploadedAsset = {
  url: string;
};

/**
 * Photo upload and crop.
 *
 * The processed image is stored as `photo.assetId`. In local-only mode this is
 * still a data URL; when cloud sync is configured it becomes the uploaded
 * Supabase Storage URL returned by the backend. Two reasons:
 *
 *  1. "Your data is never trapped" is a product bet. A photo that disappears
 *     when you export your JSON would break it.
 *  2. §12.2 decided the render service stays stateless and receives the image
 *     in the export payload. Inline means that's already true.
 *
 * That only works because we process hard before storing: square crop, 400px,
 * JPEG q0.82 → typically 30–50KB. An unprocessed 4MB phone photo inlined into
 * every autosave would be indefensible.
 *
 * Scope, so it doesn't creep: upload, pan, zoom, square/circle. No rotation,
 * no filters, no background removal, no repositioning within the header.
 */

const OUTPUT_SIZE = 400;
const JPEG_QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function PhotoField({
  deletePhoto,
  onChange,
  photo,
  uploadPhoto,
}: {
  deletePhoto?: (url: string) => Promise<void>;
  onChange: (photo: Photo | null) => void;
  photo: Photo | null;
  uploadPhoto?: (dataUrl: string, previousUrl?: string) => Promise<UploadedAsset>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [shape, setShape] = useState<Photo["shape"]>(photo?.shape ?? "circle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setSource(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("That file type isn’t supported. Use a JPEG, PNG or WebP.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That image is over 12MB. Try a smaller one.");
      return;
    }

    setBusy(true);
    try {
      // from-image honours EXIF orientation — without it, photos taken on a
      // phone arrive rotated a quarter turn.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      setSource(bitmap);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } catch {
      setError("That image couldn’t be read.");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!source) {
      return;
    }

    const dataUrl = renderSquare(source, zoom, offset);
    if (!dataUrl) {
      setError("Couldn’t process that image.");
      return;
    }

    const previousUrl = photo?.assetId;

    setBusy(true);
    onChange({
      assetId: dataUrl,
      cropRect: { x: offset.x, y: offset.y, w: zoom, h: zoom },
      shape,
    });
    try {
      const asset = uploadPhoto ? await uploadPhoto(dataUrl, previousUrl) : null;
      if (asset) {
        onChange({
          assetId: asset.url,
          cropRect: { x: offset.x, y: offset.y, w: zoom, h: zoom },
          shape,
        });
      }
      reset();
    } catch {
      setError("The photo was saved here, but could not upload to cloud.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const currentUrl = photo?.assetId;

    onChange(null);
    if (!deletePhoto || !currentUrl || !isRemoteUrl(currentUrl)) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await deletePhoto(currentUrl);
    } catch {
      setError("The photo was removed here, but could not be deleted from cloud.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photo-field">
      <span className="field-group-label">Photo</span>

      {source ? (
        <CropStage
          offset={offset}
          onOffsetChange={setOffset}
          shape={shape}
          source={source}
          zoom={zoom}
        />
      ) : photo ? (
        <div className="photo-current">
          <img alt="" className="photo-preview" data-shape={photo.shape} src={photo.assetId} />
          <div className="photo-current-actions">
            <button className="link-button" onClick={() => fileInput.current?.click()} type="button">
              Replace
            </button>
            <button className="link-button" onClick={() => void remove()} type="button">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <p className="form-note">
          Optional. Expected on CVs in many regions, and left off US-style résumés — the template decides whether it
          shows. Your photo never leaves this device except inside the file you export.
        </p>
      )}

      {source ? (
        <div className="photo-controls">
          <label className="zoom-control">
            Zoom
            <input
              max={3}
              min={1}
              onChange={(event) => setZoom(Number(event.target.value))}
              step={0.01}
              type="range"
              value={zoom}
            />
          </label>

          <div className="segmented-control" role="group" aria-label="Shape">
            {(["circle", "square"] as const).map((option) => (
              <button
                aria-pressed={shape === option}
                key={option}
                onClick={() => setShape(option)}
                type="button"
              >
                {option === "circle" ? "Circle" : "Square"}
              </button>
            ))}
          </div>

          <div className="photo-actions">
            <button className="primary" disabled={busy} onClick={() => void commit()} type="button">
              {busy ? "Uploading..." : "Use photo"}
            </button>
            <button className="link-button" onClick={reset} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {!source && !photo ? (
        <button
          className="add-button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          type="button"
        >
          {busy ? "Reading…" : "+ Add a photo"}
        </button>
      ) : null}

      <input
        accept={ACCEPTED.join(",")}
        onChange={(event) => void handleFile(event.target.files?.[0])}
        ref={fileInput}
        style={{ display: "none" }}
        type="file"
      />

      {error ? <p className="field-message" role="alert">{error}</p> : null}
    </div>
  );
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

/* ------------------------------------------------------------- crop stage */

const STAGE_PX = 180;

function CropStage({
  offset,
  onOffsetChange,
  shape,
  source,
  zoom,
}: {
  offset: { x: number; y: number };
  onOffsetChange: (offset: { x: number; y: number }) => void;
  shape: Photo["shape"];
  source: ImageBitmap;
  zoom: number;
}) {
  const dragging = useRef<{ originX: number; originY: number; startX: number; startY: number } | null>(null);

  // The image is scaled to cover the square stage, then zoomed. Offsets are
  // normalised (-1…1) so they survive a zoom change without jumping.
  const cover = Math.max(STAGE_PX / source.width, STAGE_PX / source.height);
  const drawnWidth = source.width * cover * zoom;
  const drawnHeight = source.height * cover * zoom;
  const slackX = Math.max(0, (drawnWidth - STAGE_PX) / 2);
  const slackY = Math.max(0, (drawnHeight - STAGE_PX) / 2);

  return (
    <div
      className="crop-stage"
      data-shape={shape}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = {
          originX: offset.x,
          originY: offset.y,
          startX: event.clientX,
          startY: event.clientY,
        };
      }}
      onPointerMove={(event) => {
        const drag = dragging.current;
        if (!drag || slackX + slackY === 0) {
          return;
        }
        const nextX = slackX === 0 ? 0 : clamp(drag.originX + (event.clientX - drag.startX) / slackX, -1, 1);
        const nextY = slackY === 0 ? 0 : clamp(drag.originY + (event.clientY - drag.startY) / slackY, -1, 1);
        onOffsetChange({ x: nextX, y: nextY });
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
      style={{ width: STAGE_PX, height: STAGE_PX }}
    >
      <img
        alt=""
        draggable={false}
        src={bitmapToObjectUrl(source)}
        style={{
          width: drawnWidth,
          height: drawnHeight,
          transform: `translate(calc(-50% + ${offset.x * slackX}px), calc(-50% + ${offset.y * slackY}px))`,
        }}
      />
      <span className="crop-hint">Drag to reposition</span>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Draws the visible square of the source at OUTPUT_SIZE and returns a JPEG
 * data URL. Mirrors CropStage's cover-then-zoom maths exactly — if these two
 * drift, what you crop stops being what you get.
 */
function renderSquare(source: ImageBitmap, zoom: number, offset: { x: number; y: number }): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.imageSmoothingQuality = "high";

  const cover = Math.max(OUTPUT_SIZE / source.width, OUTPUT_SIZE / source.height);
  const drawnWidth = source.width * cover * zoom;
  const drawnHeight = source.height * cover * zoom;
  const slackX = Math.max(0, (drawnWidth - OUTPUT_SIZE) / 2);
  const slackY = Math.max(0, (drawnHeight - OUTPUT_SIZE) / 2);

  context.drawImage(
    source,
    (OUTPUT_SIZE - drawnWidth) / 2 + offset.x * slackX,
    (OUTPUT_SIZE - drawnHeight) / 2 + offset.y * slackY,
    drawnWidth,
    drawnHeight,
  );

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/** Cached so the crop preview doesn't leak a URL per render. */
const objectUrls = new WeakMap<ImageBitmap, string>();

function bitmapToObjectUrl(bitmap: ImageBitmap): string {
  const existing = objectUrls.get(bitmap);
  if (existing) {
    return existing;
  }

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);

  const url = canvas.toDataURL("image/jpeg", 0.9);
  objectUrls.set(bitmap, url);
  return url;
}
