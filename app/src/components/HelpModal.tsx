"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * @description Modal de ayuda en lenguaje simple: qué es un vesting, Cliff,
 * Linear Unlock Rate, Revocability, glosario y pasos de uso.
 * @param props.open Si el diálogo está visible.
 * @param props.onClose Cierra el modal.
 * @returns Dialog accesible o null.
 */
export function HelpModal({ open, onClose }: HelpModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId}>Ayuda: conceptos de vesting</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Cerrar ayuda"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>

        <HelpTerm icon="🐷" title="¿Qué es esto?">
          <p>
            Imagina una <strong>alcancía con candado y reloj</strong>. Tú metes
            monedas (tokens) para otra persona, pero esa persona no puede
            sacarlas todas de golpe: se van soltando <strong>poco a poco</strong>{" "}
            con el paso del tiempo.
          </p>
          <p>
            Nadie puede hacer trampa con la hora: el reloj que se usa es el de la
            blockchain, no el de tu computadora.
          </p>
        </HelpTerm>

        <HelpTerm icon="👥" title="¿Quién es quién?">
          <ul>
            <li>
              <strong>Sender (el que da):</strong> quien pone los tokens en la
              alcancía.
            </li>
            <li>
              <strong>Beneficiary (el que recibe):</strong> quien va sacando los
              tokens con el tiempo.
            </li>
            <li>
              <strong>Mint:</strong> el &quot;tipo de moneda&quot;. Es la
              dirección que identifica al token (como decir &quot;dólares&quot; o
              &quot;pesos&quot;).
            </li>
            <li>
              <strong>Wallet:</strong> tu billetera (Phantom). Firma para decir
              &quot;sí, soy yo y lo autorizo&quot;.
            </li>
          </ul>
        </HelpTerm>

        <HelpTerm icon="⏳" title="Cliff Period (tiempo de espera)">
          <p>
            Es un tiempo en el que <strong>no se puede sacar nada</strong>, ni
            una moneda. Como cuando entras a un trabajo nuevo y el primer sueldo
            llega recién al final del mes.
          </p>
          <p className="help-example">
            Ejemplo: si el cliff es en 1 mes, durante ese mes el beneficiary ve{" "}
            <strong>0 disponibles</strong>. Pasado el mes, de golpe aparece todo
            lo que se fue acumulando desde el inicio.
          </p>
        </HelpTerm>

        <HelpTerm icon="📈" title="Linear Unlock Rate (liberación pareja)">
          <p>
            Después del cliff, los tokens se sueltan <strong>parejito</strong>,
            un poquito cada segundo, como una canilla que gotea siempre igual.
          </p>
          <p className="help-example">
            Ejemplo: guardas <strong>1000 tokens</strong> por{" "}
            <strong>10 días</strong>. Al día 5 (la mitad) hay{" "}
            <strong>500</strong> liberados. Al día 10, los <strong>1000</strong>.
            Si ya sacaste 300, puedes sacar los 200 que faltan de esos 500.
          </p>
        </HelpTerm>

        <HelpTerm icon="✋" title="Revocability (se puede cancelar)">
          <p>
            Al crear la alcancía eliges si se puede <strong>cancelar</strong> o
            no. Si se puede, solo el <strong>sender</strong> puede hacerlo, y es
            justo para los dos:
          </p>
          <ul>
            <li>Lo que ya se liberó → se lo lleva el beneficiary.</li>
            <li>Lo que todavía no se liberó → vuelve al sender.</li>
            <li>La alcancía se rompe (se cierra) y ya no se usa más.</li>
          </ul>
          <p className="help-example">
            Si eliges &quot;no cancelable&quot;, nadie la puede cancelar nunca.
            Piénsalo bien antes.
          </p>
        </HelpTerm>

        <HelpTerm icon="🧭" title="¿Cómo lo uso? (paso a paso)">
          <ol>
            <li>Conecta tu wallet con el botón de arriba.</li>
            <li>
              <strong>Si das tokens:</strong> llena &quot;Crear vesting&quot;
              (quién recibe, qué token, cuánto y las fechas) y firma.
            </li>
            <li>
              <strong>Si recibes tokens:</strong> carga el vesting y pulsa{" "}
              <strong>Claim</strong> para sacar lo que ya esté liberado.
            </li>
            <li>
              Mira la <strong>barra de progreso</strong> para saber cuánto va
              liberado.
            </li>
            <li>
              Arriba verás si la operación está <em>Pendiente</em>, salió{" "}
              <em>Bien</em> o <em>Falló</em>.
            </li>
          </ol>
        </HelpTerm>

        <HelpTerm icon="❓" title="Problemas comunes">
          <ul>
            <li>
              <strong>&quot;Nada para reclamar&quot;:</strong> todavía no pasó el
              cliff, o ya sacaste todo lo liberado. Espera un rato.
            </li>
            <li>
              <strong>&quot;No se puede cancelar&quot;:</strong> se creó como no
              cancelable, o no eres el sender.
            </li>
            <li>
              <strong>La transacción falla:</strong> revisa que tengas un poco de
              SOL para pagar la comisión y que la wallet esté en la red correcta.
            </li>
          </ul>
        </HelpTerm>
      </div>
    </div>
  );
}

interface HelpTermProps {
  icon: string;
  title: string;
  children: ReactNode;
}

/**
 * @description Bloque de término dentro del Help modal.
 * @param props.icon Emoji decorativo (oculto a lectores de pantalla).
 * @param props.title Título del concepto.
 * @param props.children Explicación (párrafos o listas).
 * @returns Artículo semántico.
 */
function HelpTerm({ icon, title, children }: HelpTermProps) {
  return (
    <article className="help-term">
      <h3>
        <span aria-hidden="true" className="help-icon">
          {icon}
        </span>
        {title}
      </h3>
      <div className="help-body">{children}</div>
    </article>
  );
}
