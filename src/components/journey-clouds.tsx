// Capa de nubes sobre el video: deriva ambiental en CSS y paralaje según el avance del
// recorrido (la variable --journey, 0–1, la actualiza el cabezal en journey.tsx).
const clouds = ["left", "middle"] as const;

export function JourneyClouds() {
  return <div className="cloud-layer" aria-hidden="true">
    {clouds.map((position) => <div key={position} className={`cloud-parallax cloud-parallax-${position}`}>
      <img
        className="cloud-asset"
        src="/art/cloud-bank.png"
        srcSet="/art/cloud-bank-small.webp 1076w, /art/cloud-bank.png 2152w, /art/cloud-bank-large.webp 4304w"
        sizes={position === "middle" ? "(max-width: 700px) 42vw, 25vw" : "(max-width: 700px) 73vw, 44vw"}
        alt=""
        decoding="async"
        draggable={false}
      />
    </div>)}
  </div>;
}
