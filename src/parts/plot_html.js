  function plotHTML() {
    return '<div class="frame"><div class="plot-wrap"><canvas id="plotcanvas" ' +
      'aria-label="Evaluation results. Basic scenario mean reward over 100 episodes: A2C 0.94, DQN 13.88, ' +
      'baseline 77.23, PPO 79.28. Deadly Corridor at skill 5 over 20 episodes: baseline 80.7, ' +
      'curriculum-trained PPO 673.53, best episode 2276.52."></canvas></div>' +
      '<div class="frame__cap"><em>Measured evaluation — CS 271P final report, Tables 3.1 &amp; 3.3</em>' +
      "<span>PPO 673.53 vs 80.7 baseline · 8.3×</span></div></div>";
  }

