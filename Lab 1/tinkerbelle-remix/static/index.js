const control = document.getElementById('control');
const light = document.getElementById('light');
const play = document.getElementById('play');
const pause = document.getElementById('pause');
const audioIn = document.getElementById('audioIn');
const startBreathingButton = document.getElementById('startBreathing');
const stopBreathingButton = document.getElementById('stopBreathing');
const startAlertButton = document.getElementById('startAlert');
const stopAlertButton = document.getElementById('stopAlert');
const audio = new Audio();
let pickr;
let breathingAnimation;
let alertAnimation;

// Use a calm blue while preserving the softly pulsing sleep-light rhythm.
const breathingColors = {
  dark: [0, 4, 14],
  light: [45, 145, 255],
};
const breathingCycle = 5500;
const alertColors = {
  dark: [24, 0, 0],
  light: [255, 35, 35],
};
const alertCycle = 1400;

const stopBreathing = (returnToDark = false) => {
  if (breathingAnimation) cancelAnimationFrame(breathingAnimation);
  breathingAnimation = undefined;
  if (returnToDark) document.body.style.backgroundColor = 'rgb(0, 4, 14)';
};

const stopAlert = (returnToDark = false) => {
  if (alertAnimation) cancelAnimationFrame(alertAnimation);
  alertAnimation = undefined;
  if (returnToDark) document.body.style.backgroundColor = 'rgb(24, 0, 0)';
};

const startBreathing = () => {
  stopBreathing();
  stopAlert();
  const startedAt = performance.now();

  const animate = (now) => {
    const phase = ((now - startedAt) % breathingCycle) / breathingCycle;
    // A cosine wave gives the slow, organic rise and fall of the sleep LED.
    const brightness = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    const color = breathingColors.dark.map((low, index) =>
      Math.round(low + (breathingColors.light[index] - low) * brightness)
    );
    document.body.style.backgroundColor = `rgb(${color.join(', ')})`;
    breathingAnimation = requestAnimationFrame(animate);
  };

  breathingAnimation = requestAnimationFrame(animate);
};

const startAlert = () => {
  stopBreathing();
  stopAlert();
  const startedAt = performance.now();

  const animate = (now) => {
    const phase = ((now - startedAt) % alertCycle) / alertCycle;
    // A faster red pulse reads as urgent without using a harsh strobe.
    const brightness = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    const color = alertColors.dark.map((low, index) =>
      Math.round(low + (alertColors.light[index] - low) * brightness)
    );
    document.body.style.backgroundColor = `rgb(${color.join(', ')})`;
    alertAnimation = requestAnimationFrame(animate);
  };

  alertAnimation = requestAnimationFrame(animate);
};

const socket = io();

socket.on('connect', () => {
  socket.on('hex', (val) => {
    stopBreathing();
    stopAlert();
    document.body.style.backgroundColor = val;
  })
  socket.on('audio', (val) => { getSound(encodeURI(val)); })
  socket.on('pauseAudio', (val) => { audio.pause(); })
  socket.on('breathing', (enabled) => {
    if (enabled) startBreathing();
    else stopBreathing(true);
  })
  socket.on('alert', (enabled) => {
    if (enabled) startAlert();
    else stopAlert(true);
  })
  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
});

// enter controller mode
control.onclick = () => {
  console.log('control')
  // make sure you're not in fullscreen
  if (document.fullscreenElement) {
    document.exitFullscreen()
      .then(() => console.log('exited full screen mode'))
      .catch((err) => console.error(err));
  }
  // make buttons and controls visible
  document.getElementById('user').classList.remove('fadeOut');
  document.getElementById('controlPanel').style.opacity = 0.6;
  if (!pickr) {
    // create our color picker. You can change the swatches that appear at the bottom
    pickr = Pickr.create({
      el: '.pickr',
      theme: 'classic',
      showAlways: true,
      swatches: [
        'rgba(255, 255, 255, 1)',
        'rgba(244, 67, 54, 1)',
        'rgba(233, 30, 99, 1)',
        'rgba(156, 39, 176, 1)',
        'rgba(103, 58, 183, 1)',
        'rgba(63, 81, 181, 1)',
        'rgba(33, 150, 243, 1)',
        'rgba(3, 169, 244, 1)',
        'rgba(0, 188, 212, 1)',
        'rgba(0, 150, 136, 1)',
        'rgba(76, 175, 80, 1)',
        'rgba(139, 195, 74, 1)',
        'rgba(205, 220, 57, 1)',
        'rgba(255, 235, 59, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(0, 0, 0, 1)',
      ],
      components: {
        preview: false,
        opacity: false,
        hue: true,
      },
    });

    pickr.on('change', (e) => {
      // when pickr color value is changed change background and send message on ws to change background
      const hexCode = e.toHEXA().toString();
      stopBreathing();
      stopAlert();
      document.body.style.backgroundColor = hexCode;
      socket.emit('breathing', false);
      socket.emit('alert', false);
      socket.emit('hex', hexCode)
    });
  }
};

light.onclick = () => {
  // safari requires playing on input before allowing audio
  audio.muted = true;
  audio.play().then(audio.muted = false)

  // in light mode make it full screen and fade buttons
  document.documentElement.requestFullscreen();
  document.getElementById('user').classList.add('fadeOut');
  // if you were previously in control mode remove color picker and hide controls
  if (pickr) {
    // this is annoying because of the pickr package
    pickr.destroyAndRemove();
    document.getElementById('controlPanel').append(Object.assign(document.createElement('div'), { className: 'pickr' }));
    pickr = undefined;
  }
  document.getElementById('controlPanel').style.opacity = 0;
};

startBreathingButton.onclick = () => {
  startBreathing();
  socket.emit('breathing', true);
};

stopBreathingButton.onclick = () => {
  stopBreathing(true);
  socket.emit('breathing', false);
};

startAlertButton.onclick = () => {
  startAlert();
  socket.emit('alert', true);
};

stopAlertButton.onclick = () => {
  stopAlert(true);
  socket.emit('alert', false);
};


const getSound = (query, loop = false, random = false) => {
  const url = `https://freesound.org/apiv2/search/text/?query=${query}+"&fields=name,previews&token=U5slaNIqr6ofmMMG2rbwJ19mInmhvCJIryn2JX89&format=json`;
  fetch(url)
    .then((response) => response.clone().text())
    .then((data) => {
      console.log(data);
      data = JSON.parse(data);
      if (data.results.length >= 1) var src = random ? choice(data.results).previews['preview-hq-mp3'] : data.results[0].previews['preview-hq-mp3'];
      audio.src = src;
      audio.play();
      console.log(src);
    })
    .catch((error) => console.log(error));
};

play.onclick = () => {
  socket.emit('audio', audioIn.value)
  getSound(encodeURI(audioIn.value));
};
pause.onclick = () => {
  socket.emit('pauseAudio', audioIn.value)
  audio.pause();
};
audioIn.onkeyup = (e) => { if (e.keyCode === 13) { play.click(); } };
