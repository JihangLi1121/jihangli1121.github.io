/* Real media for the deployed site. Loaded before the page script; if this
   file is absent every slot falls back to a generated placeholder, so the
   same index.html works deployed or standalone. */
window.CU_ASSETS = {
  celluniverse: {
    images: [
      { src: "assets/media/celluniverse-input-t01.jpg",
        cap: "Raw input — confocal stack, maximum-intensity projection over 33 z-slices" },
      { src: "assets/media/celluniverse-input-t26.jpg",
        cap: "t026 of the same acquisition — noisy, low-contrast, what the optimiser must fit" },
      { src: "assets/media/celluniverse-overlay.jpg",
        cap: "Fitted rings and centres reviewed against the real volume" },
      { src: "assets/media/celluniverse-fit.jpg",
        cap: "Solver output — fitted oblate spheroids, rendered in 3D" }
    ],
    video: {
      src: "assets/media/celluniverse-showcase.mp4",
      poster: "assets/media/celluniverse-showcase.jpg",
      cap: "Full run — raw volume, synthetic fit, lineage tree, and overlay review",
      meta: "171 frames · 4 fps · H.264 · 13 MB"
    }
  },
  launchmail: {
    images: [
      { src: "assets/media/launchmail-workflow.jpg",
        cap: "Workflow builder — agent block, AI reply split, and the three branches it feeds" },
      { src: "assets/media/launchmail-agents.jpg",
        cap: "Agent console — trust level, pacing, permissions and approval quality" },
      { src: "assets/media/launchmail-login.jpg",
        cap: "Sign-in — the product's front door" }
    ],
    video: {
      src: "assets/media/launchmail-tour.mp4",
      poster: "assets/media/launchmail-tour.jpg",
      cap: "UI tour — workflow builder, agent console, sign-in (stills, not a screen recording)",
      meta: "Demo workspace · synthetic data"
    }
  },
  doom: {
    images: [
      { src: "assets/media/doom-2.jpg",  cap: "Deadly Corridor — approach, enemies on both walls" },
      { src: "assets/media/doom-8.jpg",  cap: "Mid-run — the agent trades health for forward progress" },
      { src: "assets/media/doom-15.jpg", cap: "Late run — corridor cleared, closing on the objective" }
    ],
    video: {
      src: "assets/media/doom-corridor.mp4",
      poster: "assets/media/doom-corridor.jpg",
      cap: "Deadly Corridor — best run from the trained PPO agent",
      meta: "VizDoom · 30 fps · H.264 · 3 MB"
    }
  }
};
