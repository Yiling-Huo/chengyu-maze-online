const TOTAL_TRIALS = 10;

// === Load materials ===
// Function to pre-load the list of chengyu
function preload() {
// Load chengyu list as plain text
this.load.text('chengyuList', 'assets/chengyu-list.csv');
// Load character frequency as plain text
this.load.text('charFreq', 'assets/character-rank.csv');
}

// === Create game with phaser===
function create() {
const scene = this;

// Set font family (extract from css file)
const fontStack = getComputedStyle(document.documentElement)
    .getPropertyValue("--main-font").trim();

// Parse chengyu list
const rawText = this.cache.text.get('chengyuList') || '';

const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

const chengyuList = lines
    .map(line => {
    // split on comma, take first cell
    const firstCell = line.split(',')[0].trim();
    // console.log(firstCell)

    // split each chengyu to characters
    const chars = firstCell.split("");
    return chars;
    })
    .filter(chars => chars.length === 4);

// console.log("Extracted chengyuList:", chengyuList);

// Parse character frequency
const rawFreq = this.cache.text.get('charFreq') || '';
const freqLines = rawFreq.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

const charRank = freqLines.map(line => {
  const [char] = line.split(',')[1];
  return char.trim().replace(/^"(.*)"$/, '$1');
});

// Create character frequency ranking map
const charRankIndexMap = new Map();
charRank.forEach((ch, i) => {
  charRankIndexMap.set(ch, i);
});
// console.log(charRankIndexMap);

// === Initial game attributes ===
let trialCount = 0;
let correctCount = 0;
let currentChengyu = null;     // [w1, w2, w3, w4]
let currentLocation = 1;     // 1..3 (choosing word at this index)
let optionButtons = [];
let acceptingInput = true;

// keep a record of all trials and difficulty
let trialHistory = [];
let selectedChengyu = [];
let dif = '墨客模式';

// select initial chengyu
let currentChengyuIndex = Math.floor(Math.random() * 502);  // start from high frequency (-500 in rank)
let difficultyIndex = 0;  // adaptive difficulty anchor

let MIN_DIFFICULTY_STEP = Math.floor((chengyuList.length + 1000)/(TOTAL_TRIALS*5));
// console.log(MIN_DIFFICULTY_STEP)
let MAX_DIFFICULTY_STEP = Math.floor((chengyuList.length + 1000)/(TOTAL_TRIALS-1));
// console.log(MAX_DIFFICULTY_STEP)
// for the surprise easy trial mechanism
const SURPRISE_THRESHOLD    = 2000;   // only allow surprise easy trial if last > 2000
const SURPRISE_PROBABILITY  = 1 / 20; // 5% chance to trigger a surprise easy trial
const SURPRISE_EASY_MAX_RANK = 499;   // surprise easy trial = first 500 chengyu (0–499)

// ==== UI ELEMENTS ====
const isNarrow = window.innerWidth < 600;   // treat as phone
const uiScale  = isNarrow ? 1.4 : 1.0;      // make text ~40% bigger on phones

// helper to get scaled font sizes
const fs = (base) => Math.round(base * uiScale);

const headerText = this.add.text(20, 50, '', {
    fontFamily: fontStack,
    fontSize: fs(24),
    fill: '#0C6170'
});

const chengyuText = this.add.text(300, 200, '', {
    fontFamily: fontStack,
    fontSize: fs(32),
    fill: '#0C6170'
}).setOrigin(0, 0.5);

const restText = this.add.text(300, 200, '', {
    fontFamily: fontStack,
    fontSize: fs(32),
    fill: '#83BDC0'
}).setOrigin(0, 0.5);

const feedbackText = this.add.text(450, 50, '', {
    fontFamily: fontStack,
    fontSize: fs(24),
    fill: '#0C6170'
}).setOrigin(0, 0);

showWelcomeScreen();

// startNextTrial(null);

// === Functions ===

function showWelcomeScreen() {
  // Title
  const titleText = scene.add.text(
    400,
    180,
    '欢迎来到成语迷宫！',
    {
      fontFamily: fontStack,
      fontSize: fs(36),
      fill: '#0C6170',
      align: 'center',
      padding: { top: 8 }
    }
  ).setOrigin(0.5);

  // Instructions
  const instructions = [
    '',
    '在两个选项当中选择能够组成成语的选项',
    '',
    '选择游戏难度'
  ].join('\n');

  const versionText = scene.add.text(
    400,
    550,
    'version: 0.2.2',
    {
      fontFamily: fontStack,
      fontSize: fs(15),
      fill: '#0C6170',
      align: 'center',
      padding: { top: 2 }
    }
  ).setOrigin(0.5);

  const introText = scene.add.text(
    400,
    260,
    instructions,
    {
      fontFamily: fontStack,
      fontSize: fs(20),
      fill: '#0C6170',
      align: 'center',
      lineSpacing: 6,
      padding: { top: 2 }
    }
  ).setOrigin(0.5);

  // Start button (simple text button)
  const startStyle = {
    fontFamily: fontStack,
    fontSize: fs(24),
    fill: '#FFFFFF',
    backgroundColor: '#37BEB0',
    padding: { x: 24, y: 12 }
  };

  // Hard mode
  const startButton1 = scene.add.text(
    500,
    400,
    '墨客',
    startStyle
  ).setOrigin(0.5).setInteractive({ useHandCursor: true });

  startButton1.on('pointerover', () => {
    startButton1.setStyle({ backgroundColor: '#83BDC0' });
  });

  startButton1.on('pointerout', () => {
    startButton1.setStyle({ backgroundColor: '#37BEB0' });
  });

  startButton1.on('pointerdown', () => {
    // Remove welcome screen elements
    titleText.destroy();
    versionText.destroy();
    introText.destroy();
    startButton1.destroy();
    startButton2.destroy();

    // Start the first trial
    startNextTrial(null);
  });

    const startButton2 = scene.add.text(
    300,
    400,
    '市民',
    startStyle
  ).setOrigin(0.5).setInteractive({ useHandCursor: true });

  startButton2.on('pointerover', () => {
    startButton2.setStyle({ backgroundColor: '#83BDC0' });
  });

  startButton2.on('pointerout', () => {
    startButton2.setStyle({ backgroundColor: '#37BEB0' });
  });

  startButton2.on('pointerdown', () => {
    // Remove welcome screen elements
    titleText.destroy();
    versionText.destroy();
    introText.destroy();
    startButton1.destroy();
    startButton2.destroy();

    // Adjust difficulty
    dif = '市民模式';
    currentChengyuIndex = Math.floor(Math.random() * 200);  // start from high frequency (-200 in rank)
    MIN_DIFFICULTY_STEP = Math.floor((1200)/(TOTAL_TRIALS*5));
    // console.log(MIN_DIFFICULTY_STEP)
    MAX_DIFFICULTY_STEP = Math.floor((1200)/(TOTAL_TRIALS-1));
    // console.log(MAX_DIFFICULTY_STEP)

    // Start the first trial
    startNextTrial(null);
  });
}

/**
 * Pick the next chengyu index based on previous trial correctness.
 * wasCorrect: true, false, or null (for very first trial)
 */
// This might belong to functions.js, but too much work to figure out global and local variables...
function pickNextChengyuIndex(wasCorrect) {
  const lastShownIndex = currentChengyuIndex;      // what we just used
  const maxIndex = chengyuList.length - 1;

  // First trial: just start from difficultyIndex / currentChengyuIndex as set above
  if (wasCorrect === null) {
    difficultyIndex = currentChengyuIndex;
  } else {
    const lastDiffIndex = difficultyIndex;

    if (wasCorrect) {
      // When player was correct, increase difficulty (decrease frequency ranking)

      if (lastDiffIndex >= maxIndex) {
        // Already at the hard end → random in the hard region near the end
        const spanStart = Math.max(maxIndex - MAX_DIFFICULTY_STEP, 0);
        const spanEnd   = maxIndex;
        difficultyIndex = getRandomUnusedIndex(selectedChengyu, spanStart, spanEnd);
      } else {
        const min = Math.min(lastDiffIndex + MIN_DIFFICULTY_STEP, maxIndex);
        const max = Math.min(lastDiffIndex + MAX_DIFFICULTY_STEP, maxIndex);

        if (min <= max) {
          difficultyIndex = randomInt(min, max);
        } else {
          difficultyIndex = lastDiffIndex; // safety
        }
      }

    } else {
      // When player was wrong, decrease difficulty (increase frequency ranking)

      if (lastDiffIndex <= 0) {
        // Already at easiest → random in an easy band near the start
        const spanStart = 0;
        const spanEnd   = Math.min(MAX_DIFFICULTY_STEP, maxIndex);
        difficultyIndex = getRandomUnusedIndex(selectedChengyu, spanStart, spanEnd);
      } else {
        const min = Math.max(lastDiffIndex - MAX_DIFFICULTY_STEP, 0);
        const max = Math.max(lastDiffIndex - 1, 0); // WHEN DECREASING DIFFICULTY, do not add a minimum step

        if (min <= max) {
          difficultyIndex = randomInt(min, max);
        } else {
          difficultyIndex = lastDiffIndex; // safety
        }
      }
    }
  }

  // Surprise easy trial
  const canSurprise = lastShownIndex > SURPRISE_THRESHOLD;
  const easyPoolMax = Math.min(SURPRISE_EASY_MAX_RANK, maxIndex);

  if (canSurprise && easyPoolMax >= 0 && Math.random() < SURPRISE_PROBABILITY) {
    // Pick a random easy chengyu from the first ~500
    currentChengyuIndex = randomInt(0, easyPoolMax);

    console.log(
      "Surprise easy trial! Using index",
      currentChengyuIndex
    );
  } else {
    // Normal case: show chengyu at the current difficulty anchor
    currentChengyuIndex = difficultyIndex;
  }

  return currentChengyuIndex;
}

function startNextTrial(wasCorrect = null) {
  if (trialCount >= TOTAL_TRIALS) {
    endGame();
    return;
  }

  trialCount++;
  currentLocation = 1;
  feedbackText.setText('');
  clearOptions();
  acceptingInput = true;

  // pick index based on difficulty
  const idx = pickNextChengyuIndex(wasCorrect);
  currentChengyu = chengyuList[idx];

  // Keep this so player (I) can cheat lol
  console.log("Current chengyu:", currentChengyu.join(''), "frequency rank: ", idx);

  updateHeader();
  updateChengyuText();
  eraseRestText();
  showOptions();
}

function updateHeader() {
    headerText.setText(`成语 ${trialCount} / ${TOTAL_TRIALS}   当前得分：${correctCount}`);
}

function updateChengyuText() {
    const confirmedChars = currentChengyu.slice(0, currentLocation).join(' ');
    chengyuText.setText(confirmedChars);
}

function eraseRestText() {
  restText.setText('');
}

function showOptions() {
    clearOptions();

    const correctWord = currentChengyu[currentLocation];

    // select the incorrect option with getOptions
    const incorrectWord = getOptions(
        currentChengyu,
        currentLocation,
        charRank,
        chengyuList,
        charRankIndexMap
    );

    const options = [correctWord, incorrectWord];
    Phaser.Utils.Array.Shuffle(options);

    const style = {
    fontFamily: fontStack,
    fontSize: fs(28),
    fill: '#fff',
    backgroundColor: '#37BEB0',
    padding: { x: 30, y: 15 }
    };

    const yBase = 350;
    const spacing = 200;
    const xCenter = 400;

    options.forEach((word, index) => {
    const x = xCenter + (index === 0 ? -spacing / 2 : spacing / 2);
    const button = scene.add.text(x, yBase, word, style)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    button.isCorrect = (word === correctWord);

    button.on('pointerover', () => {
        button.setStyle({ backgroundColor: '#83BDC0' });
    });

    button.on('pointerout', () => {
        button.setStyle({ backgroundColor: '#37BEB0' });
    });

    button.on('pointerdown', () => {
        if (!acceptingInput) return;
        handleOptionClick(button.isCorrect);
    });

    optionButtons.push(button);
    });
}

function handleOptionClick(isCorrect) {
    acceptingInput = false;

    if (isCorrect) {
    if (currentLocation === 3) {
        // Completed all four characters
        correctCount++;
        feedbackText.setText('恭喜！');
        updateHeader();
        chengyuText.setText(currentChengyu.join(' '));
        // Append current chengyu to history
        trialHistory.push({
                phrase: currentChengyu.join(''),
                success: true
            });
        selectedChengyu.push(currentChengyuIndex);
        clearOptions();
        scene.time.delayedCall(500, () => {
        acceptingInput = true;
        startNextTrial(true);
        });
    } else {
        // Move to next character
        //feedbackText.setText('正确！');
        currentLocation++;
        updateChengyuText();
        scene.time.delayedCall(300, () => {
        feedbackText.setText('');
        acceptingInput = true;
        showOptions();
        });
    }
    } else {
    feedbackText.setText('错误……');
    restText.setText(currentChengyu.join(' ').slice(chengyuText.text.length));
    restText.setPosition(
        chengyuText.x + chengyuText.width,
        restText.y);
    // Append current chengyu to history
    trialHistory.push({
        phrase: currentChengyu.join(''),
        success: false
    });
    selectedChengyu.push(currentChengyuIndex);
    clearOptions();
    scene.time.delayedCall(500, () => {
        acceptingInput = true;
        startNextTrial(false);
    });
    }
}

function clearOptions() {
    optionButtons.forEach(btn => btn.destroy());
    optionButtons = [];
}

function endGame() {
    clearOptions();
    chengyuText.setText('');
    headerText.setText(`游戏结束！ ${dif}    得分：${correctCount}`);
    feedbackText.setText('');

    // Print summary
    const lines = trialHistory.map((t, i) => {
        const mark = t.success ? '✅' : '❌';
        // i+1 = trial number
        return `${i + 1}. ${t.phrase}  ${mark}`;
    });

    // Split into two columns
    const leftCol  = lines.slice(0, 10).join('\n');
    const rightCol = lines.slice(10).join('\n');

    // Left column
    scene.add.text(
        80,      // x
        150,     // y
        leftCol,
        {
            fontSize: fs(20),
            fill: '#0C6170',
            align: 'left',
            lineSpacing: 6,
            padding: { top: 2 }
        }
    ).setOrigin(0, 0);

    // Right column
    scene.add.text(
        400,
        150,
        rightCol,
        {
            fontSize: fs(20),
            fill: '#0C6170',
            align: 'left',
            lineSpacing: 6,
            padding: { top: 2 }
        }
    ).setOrigin(0, 0);

    scene.add.text(
    400,
    500,
    '刷新页面开始新一轮。',
    { fontFamily: fontStack, fontSize: fs(24), fill: '#0C6170' }
    ).setOrigin(0.5);
}

}

const config = {
type: Phaser.AUTO,
width: 800,
height: 600,
backgroundColor: '#DBF5F0',
scene: {
    preload: preload,
    create: create
}
};

const game = new Phaser.Game(config);