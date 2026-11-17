import { ScanFace } from "lucide-react";

/**
 * A Nau-ino app window for the landing page: title bar with the app name and the current screen,
 * then the content in the real app's colours (dark slate panels, amber accent; see .lp-app in
 * landing.css, values taken from the camera app's control-room theme). The page around it keeps
 * its Dusk look, so the product reads as the product.
 */
export function AppFrame({ screen, status = "Local · 6 cameras", className = "", children }: { screen: string; status?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`lp-app ${className}`}>
      <div className="lp-app__bar">
        <span className="lp-app__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="lp-app__brand">
          <ScanFace aria-hidden="true" />
          Nau-ino
        </span>
        <span className="lp-app__screen">{screen}</span>
        <span className="lp-app__status">
          <span className="lp-app__ok" aria-hidden="true" />
          {status}
        </span>
      </div>
      <div className="lp-app__body">{children}</div>
    </div>
  );
}
