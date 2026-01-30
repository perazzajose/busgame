"use client"

import { useEffect, useRef } from "react"

export default function BusGame() {
  const gameInitialized = useRef(false)

  useEffect(() => {
    if (gameInitialized.current) return
    gameInitialized.current = true

    // Game variables
    let juegoIniciado = false
    let time = new Date()
    let deltaTime = 0
    const sueloY = 22
    let velY = 0
    const impulso = 900
    let gravedad = 2500
    const gravedadFlotado = 2500
    let dinoPosY = sueloY
    let sueloX = 0
    let velEscenario = 1000 / 3
    let score = 0
    let parado = false
    let obstaculos: HTMLDivElement[] = []
    let tiempoHastaObstaculo = 2
    let nubes: HTMLDivElement[] = []
    let tiempoHastaNube = 1
    let fondosTramo: HTMLDivElement[] = []
    let currentScale = 1
    let empresaSeleccionada = "COT"

    const eventosTramo = [
      { score: 1, img: "/chuy.png", x: 0, usado: false },
      { score: 5, img: "/tramo1_b.png", x: 0, usado: false },
      { score: 15, img: "/fortaleza.png", x: 0, usado: false },
      { score: 10, img: "/coronilla.png", x: 0, usado: false },
      { score: 20, img: "/puntadeldiablo.png", x: 0, usado: false },
      { score: 35, img: "/tramo2_b.png", x: 0, usado: false },
      { score: 50, img: "/tramo4_a.png", x: 0, usado: false },
    ]

    const TIPOS_OBSTACULO = [
      { clase: "cactus", minScore: 0 },
      { clase: "cactus2", minScore: 0 },
      { clase: "barrera", minScore: 20 },
      { clase: "auto", minScore: 50 },
    ]

    // Elements
    const contenedor = document.querySelector(".contenedor") as HTMLDivElement
    const dino = document.querySelector(".dino") as HTMLDivElement
    const suelo = document.querySelector(".suelo") as HTMLDivElement
    const textoScore = document.querySelector(".score") as HTMLDivElement
    const gameOverEl = document.querySelector(".game-over") as HTMLDivElement
    const menuSkins = document.getElementById("menu-skins") as HTMLDivElement
    const gameWrapper = document.querySelector(".game-wrapper") as HTMLDivElement
    const rankingDiv = document.getElementById("ranking") as HTMLDivElement

    // Scale game
    function scaleGame() {
      const game = document.querySelector(".game") as HTMLDivElement
      if (!game) return
      const scaleX = window.innerWidth / 920
      const scaleY = window.innerHeight / 280
      currentScale = Math.min(scaleX, scaleY)
      game.style.transform = `scale(${currentScale})`
    }

    window.addEventListener("resize", scaleGame)
    scaleGame()

    // Orientation check
    function checkOrientation() {
      const warning = document.getElementById("rotate-warning") as HTMLDivElement
      if (warning) {
        warning.style.display = window.innerHeight > window.innerWidth ? "flex" : "none"
      }
    }

    window.addEventListener("resize", checkOrientation)
    checkOrientation()

    // Supabase
    const SUPABASE_URL = "https://wpejrhaaqbibqwzliffk.supabase.co"
    const SUPABASE_KEY = "sb_publishable_vLM9t7ythx-PAvQE70s_fQ_g96Dcsnh"

    // @ts-expect-error - Supabase loaded via CDN
    const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY)

    async function cargarRankingMenu() {
      const cont = document.getElementById("ranking-menu-list")
      if (!cont || !supabaseClient) return

      try {
        const { data, error } = await supabaseClient
          .from("scores")
          .select("player_name, score, empresa")
          .order("score", { ascending: false })
          .limit(5)

        if (error || !data) {
          cont.innerHTML = "Error cargando ranking"
          return
        }

        cont.innerHTML = ""
        data.forEach((r: { player_name: string; score: number; empresa: string }, i: number) => {
          cont.innerHTML += `<div style="margin-bottom:6px;">${i + 1}. ${r.player_name} ${r.empresa || ""} — <b>${r.score}</b></div>`
        })
      } catch {
        cont.innerHTML = "Error cargando ranking"
      }
    }

    async function guardarScoreOnline() {
      const nombreInput = document.getElementById("playerName") as HTMLInputElement
      const nombre = nombreInput?.value.trim() || "Anonimo"

      if (!supabaseClient) return

      try {
        await supabaseClient.from("scores").insert([
          {
            player_name: nombre,
            score: score,
            empresa: empresaSeleccionada,
          },
        ])
      } catch (e) {
        console.error("Error guardando score", e)
      }
    }

    async function cargarRanking() {
      if (!rankingDiv || !supabaseClient) return

      try {
        const { data, error } = await supabaseClient
          .from("scores")
          .select("player_name, score")
          .order("score", { ascending: false })
          .limit(5)

        if (error || !data) return

        rankingDiv.style.display = "block"
        rankingDiv.innerHTML = "<b>TOP 5 Choferes</b><br><br>"
        data.forEach((r: { player_name: string; score: number }, i: number) => {
          rankingDiv.innerHTML += `${i + 1}. ${r.player_name} — ${r.score}<br>`
        })
      } catch {
        // Ignore ranking load errors
      }
    }

    // Choose skin
    function elegirSkin(png: string) {
      if (png === "/dino.png") empresaSeleccionada = "COT"
      if (png === "/dino2.png") empresaSeleccionada = "CYNSA"
      if (png === "/dino3.png") empresaSeleccionada = "RUTAS"

      const dinoImg = dino?.querySelector("img")
      if (dinoImg) dinoImg.src = png

      if (gameWrapper) gameWrapper.style.pointerEvents = "auto"
      if (menuSkins) menuSkins.style.display = "none"

      cargarRankingMenu()
      juegoIniciado = true
      parado = false
      score = 0
      if (textoScore) textoScore.textContent = String(score)

      obstaculos.forEach((o) => o.remove())
      obstaculos = []

      fondosTramo.forEach((f) => f.remove())
      fondosTramo = []
      eventosTramo.forEach((e) => (e.usado = false))

      nubes.forEach((n) => n.remove())
      nubes = []

      dinoPosY = sueloY
      velY = 0

      if (gameOverEl) gameOverEl.style.display = "none"
      if (rankingDiv) rankingDiv.style.display = "none"

      time = new Date()
    }

    // Expose to window for onclick handlers
    ;(window as Window & { ElegirSkin: (png: string) => void }).ElegirSkin = elegirSkin

    // Jump
    function saltar() {
      if (dinoPosY === sueloY) {
        velY = impulso
        gravedad = gravedadFlotado
      }
    }

    // Keyboard
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && dinoPosY === sueloY) {
        velY = impulso
      }
    })

    // Touch
    contenedor?.addEventListener(
      "touchstart",
      (e) => {
        if (!juegoIniciado) return
        e.preventDefault()
        saltar()
      },
      { passive: false }
    )

    // Game loop
    function loop() {
      deltaTime = (new Date().getTime() - time.getTime()) / 1000
      time = new Date()
      update()
      requestAnimationFrame(loop)
    }

    function update() {
      if (!juegoIniciado || parado) return

      velY -= gravedad * deltaTime
      velEscenario = 1000 / 3 + score * 3

      moverDino()
      moverSuelo()
      crearObstaculos()
      moverObstaculos()
      crearNubes()
      moverNubes()
      crearFondosTramo()
      moverFondosTramo()
      detectarColision()
    }

    function moverDino() {
      if (deltaTime <= 0 || isNaN(deltaTime)) return

      dinoPosY += velY * deltaTime

      if (dinoPosY <= sueloY) {
        dinoPosY = sueloY
        velY = 0
      }

      if (isNaN(dinoPosY)) {
        dinoPosY = sueloY
        velY = 0
      }

      if (dino) dino.style.bottom = dinoPosY + "px"
    }

    function moverSuelo() {
      sueloX += velEscenario * deltaTime
      if (suelo) suelo.style.left = -(sueloX % 920) + "px"
    }

    function crearNubes() {
      tiempoHastaNube -= deltaTime
      if (tiempoHastaNube > 0) return

      const n = document.createElement("div")
      n.className = "nube"
      ;(n as HTMLDivElement & { posX: number; posY: number }).posX = 920
      ;(n as HTMLDivElement & { posX: number; posY: number }).posY = 160 + Math.random() * 40

      n.style.left = (n as HTMLDivElement & { posX: number }).posX + "px"
      n.style.bottom = (n as HTMLDivElement & { posY: number }).posY + "px"

      contenedor?.appendChild(n)
      nubes.push(n)

      tiempoHastaNube = 2 + Math.random() * 3
    }

    function moverNubes() {
      for (let i = nubes.length - 1; i >= 0; i--) {
        const n = nubes[i] as HTMLDivElement & { posX: number }
        n.posX -= velEscenario * deltaTime * 0.3
        n.style.left = n.posX + "px"

        if (n.posX < -100) {
          n.remove()
          nubes.splice(i, 1)
        }
      }
    }

    function crearFondosTramo() {
      eventosTramo.forEach((e) => {
        if (!e.usado && score >= e.score) {
          const bg = document.createElement("div")
          bg.className = "bg-tramo"
          bg.style.backgroundImage = `url(${e.img})`
          ;(bg as HTMLDivElement & { posX: number }).posX = 920 + e.x
          bg.style.left = (bg as HTMLDivElement & { posX: number }).posX + "px"

          contenedor?.appendChild(bg)
          fondosTramo.push(bg)
          e.usado = true
        }
      })
    }

    function moverFondosTramo() {
      for (let i = fondosTramo.length - 1; i >= 0; i--) {
        const bg = fondosTramo[i] as HTMLDivElement & { posX: number }
        bg.posX -= velEscenario * deltaTime
        bg.style.left = bg.posX + "px"

        if (bg.posX < -400) {
          bg.remove()
          fondosTramo.splice(i, 1)
        }
      }
    }

    function crearObstaculos() {
      tiempoHastaObstaculo -= deltaTime
      if (tiempoHastaObstaculo > 0) return

      const disponibles = TIPOS_OBSTACULO.filter((t) => score >= t.minScore)
      const tipo = disponibles[Math.floor(Math.random() * disponibles.length)]

      const o = document.createElement("div")
      o.className = "obstaculo " + tipo.clase
      ;(o as HTMLDivElement & { posX: number }).posX = 920
      o.style.left = "920px"

      contenedor?.appendChild(o)
      obstaculos.push(o)

      const dificultad = Math.min(score * 0.02, 1)
      tiempoHastaObstaculo = 1.5 - dificultad + Math.random() * 0.8
    }

    function moverObstaculos() {
      for (let i = obstaculos.length - 1; i >= 0; i--) {
        const o = obstaculos[i] as HTMLDivElement & { posX: number }
        o.posX -= velEscenario * deltaTime
        o.style.left = o.posX + "px"

        if (o.posX < -100) {
          o.remove()
          obstaculos.splice(i, 1)
          score++
          if (textoScore) textoScore.textContent = String(score)
        }
      }
    }

    function detectarColision() {
      obstaculos.forEach((o) => {
        if (isCollision(dino, o, 8, 8, 8, 8)) gameOver()
      })
    }

    function isCollision(a: HTMLElement, b: HTMLElement, pt: number, pr: number, pb: number, pl: number) {
      const ar = a.getBoundingClientRect()
      const br = b.getBoundingClientRect()
      return !(
        ar.bottom - pb * currentScale < br.top ||
        ar.top + pt * currentScale > br.bottom ||
        ar.right - pr * currentScale < br.left ||
        ar.left + pl * currentScale > br.right
      )
    }

    function gameOver() {
      parado = true
      if (gameOverEl) gameOverEl.style.display = "block"
      guardarScoreOnline()
      cargarRanking()
    }

    // Start
    cargarRankingMenu()
    loop()
  }, [])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html,
        body {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
        }
        body {
          touch-action: manipulation;
          background: #584040;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: Verdana;
          padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
            env(safe-area-inset-left);
        }
        .game-wrapper {
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: none;
        }
        .game {
          image-rendering: pixelated;
          transform-origin: center center;
        }
        .contenedor {
          width: 920px;
          height: 280px;
          position: relative;
          overflow: hidden;
        }
        .dino {
          width: 100px;
          height: 50px;
          position: absolute;
          left: 42px;
          bottom: 22px;
          z-index: 5;
        }
        .dino img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          image-rendering: pixelated;
        }
        .suelo {
          width: 200%;
          height: 42px;
          position: absolute;
          bottom: 0;
          background: url(/suelo.png) repeat-x;
          background-size: 50% 42px;
          z-index: 3;
          left: 0;
        }
        .obstaculo {
          position: absolute;
          bottom: 16px;
          width: 45px;
          height: 45px;
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          z-index: 5;
        }
        .cactus {
          background-image: url(/cactus1.png);
        }
        .cactus2 {
          background-image: url(/cactus2.png);
        }
        .barrera {
          background-image: url(/barrera.png);
          width: 55px;
        }
        .auto {
          background-image: url(/auto.png);
          width: 65px;
        }
        .nube {
          position: absolute;
          width: 46px;
          height: 14px;
          background-image: url("/nube.png");
          background-size: contain;
          background-repeat: no-repeat;
          z-index: 0;
          pointer-events: none;
        }
        .bg-tramo {
          position: absolute;
          bottom: 28px;
          width: 500px;
          height: 160px;
          background-repeat: no-repeat;
          background-position: bottom center;
          background-size: contain;
          image-rendering: pixelated;
          pointer-events: none;
          z-index: 1;
        }
        .score {
          position: absolute;
          top: 5px;
          right: 15px;
          font-size: 30px;
          font-weight: bold;
          color: #d48871;
        }
        .game-over {
          position: absolute;
          width: 100%;
          top: 120px;
          text-align: center;
          font-size: 30px;
          font-weight: bold;
          color: #7e928b;
          display: none;
        }
        #menu-skins {
          position: fixed;
          inset: 0;
          background: #3b2f2f;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          color: white;
          pointer-events: auto;
        }
        .skins {
          display: flex;
          gap: 20px;
          margin-top: 15px;
        }
        .skin-card {
          width: 150px;
          height: 190px;
          background: #eee;
          border-radius: 8px;
          cursor: pointer;
          padding: 10px;
          text-align: center;
          color: #333;
        }
        .preview {
          width: 100px;
          height: 50px;
          margin: auto;
          background-size: contain;
          background-repeat: no-repeat;
          image-rendering: pixelated;
        }
        #rotate-warning {
          pointer-events: none;
        }
        #rotate-warning[style*="display: flex"] {
          pointer-events: auto;
        }
        .player-card {
          background: #eee;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
          color: #333;
          text-align: center;
        }
        .player-card input {
          padding: 6px;
          width: 160px;
          margin-top: 8px;
        }
        @media (max-height: 500px) {
          #menu-skins {
            padding: 10px;
            overflow-y: auto;
            touch-action: auto;
          }
          .skins {
            flex-direction: column;
            align-items: center;
          }
          .skin-card {
            width: 220px;
            height: auto;
          }
          #ranking-menu {
            width: 100%;
            max-width: 280px;
            margin-top: 15px;
          }
        }
      `}</style>

      <div
        id="rotate-warning"
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          color: "white",
          display: "none",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "24px",
          zIndex: 10000,
          textAlign: "center",
        }}
      >
        Gira el celular
        <br />
        para jugar
      </div>

      <div id="menu-skins">
        <h2>Elegi tu omnibus</h2>

        <div className="menu-layout">
          <div className="player-card">
            <p>Nombre del jugador</p>
            <input id="playerName" type="text" placeholder="Tu nombre" />
          </div>

          <div className="skins">
            <div className="skin-card" onClick={() => (window as Window & { ElegirSkin: (s: string) => void }).ElegirSkin("/dino.png")}>
              <div className="preview" style={{ backgroundImage: "url('/dino.png')" }}></div>
              <p>COT</p>
            </div>
            <div className="skin-card" onClick={() => (window as Window & { ElegirSkin: (s: string) => void }).ElegirSkin("/dino2.png")}>
              <div className="preview" style={{ backgroundImage: "url('/dino2.png')" }}></div>
              <p>Cynsa</p>
            </div>
            <div className="skin-card" onClick={() => (window as Window & { ElegirSkin: (s: string) => void }).ElegirSkin("/dino3.png")}>
              <div className="preview" style={{ backgroundImage: "url('/dino3.png')" }}></div>
              <p>Rutas del Sol</p>
            </div>
          </div>
        </div>

        <div
          id="ranking-menu"
          style={{
            marginTop: "25px",
            background: "#eee",
            color: "#333",
            padding: "15px",
            borderRadius: "8px",
            width: "320px",
            textAlign: "center",
          }}
        >
          <b>TOP 5</b>
          <div id="ranking-menu-list" style={{ marginTop: "10px" }}></div>
        </div>
      </div>

      <div className="game-wrapper">
        <div className="game">
          <div className="contenedor">
            <div className="suelo"></div>
            <div className="dino">
              <img src="/dino.png" alt="Bus" />
            </div>
            <div className="score">0</div>
            <div className="game-over">GAME OVER</div>
            <div
              id="ranking"
              style={{
                position: "absolute",
                top: "160px",
                width: "100%",
                textAlign: "center",
                color: "#fff",
                fontSize: "18px",
                display: "none",
              }}
            ></div>
          </div>
        </div>
      </div>
    </>
  )
}
