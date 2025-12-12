// Function to select a random integer
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to get random chengyu index that's not appeared in game from a range of indices
function getRandomUnusedIndex(selectedChengyu, min, max) {
  const candidates = [];
  for (let i = min; i <= max; i++) {
    if (!selectedChengyu.includes(i)) {
      candidates.push(i);
    }
  }
  if (candidates.length === 0) {
    return randomInt(min, max);
  }
  return candidates[randomInt(0, candidates.length - 1)];
}

function getOptions(chengyu, currentLocation, charRank, chengyuList, charRankIndexMap) {
  const correctChar = chengyu[currentLocation];

  let curCharRank = charRankIndexMap.has(correctChar)
    ? charRankIndexMap.get(correctChar)
    : 14900;

  const windowSize = 50;
  const maxIndex = charRank.length - 1;

  // 2. Build a candidate pool of chars with similar frequency (rank ± window)
  const start = Math.max(curCharRank - windowSize, 0);
  const end = Math.min(curCharRank + windowSize, maxIndex);

  const candidates = [];

  for (let i = start; i <= end; i++) {
    if (i === curCharRank) continue; // skip the correct char
    candidates.push(charRank[i]);
  }

  // Fallback: if no candidates in window, use any other char
  if (candidates.length === 0) {
    for (let i = 0; i < charRank.length; i++) {
      if (charRank[i] !== correctChar) {
        candidates.push(charRank[i]);
      }
    }
  }

  // 3. Pick a random candidate
  const candidate =
    (typeof Phaser !== "undefined" && Phaser.Utils?.Array?.GetRandom)
      ? Phaser.Utils.Array.GetRandom(candidates)
      : candidates[Math.floor(Math.random() * candidates.length)];

  // 4. Check if this candidate would create a real chengyu
  const partial = chengyu.slice(0, currentLocation).join('') + candidate;
  // console.log(partial);

  const found = chengyuList.some(c => c.includes(partial));
  // (same logic as: any(chengyu[:current_location]+candidate in c for c in chengyuList))

  if (found) {
    // If it accidentally forms a valid chengyu, try again recursively
    return getOptions(chengyu, currentLocation, charRank, chengyuList);
  }

  return candidate;
}

function scaleHard(x) {
  const inMin = 8000;
  const inMax = 180000;
  const outMin = 3.5;
  const outMax = 5;

  const t = Math.min(1, Math.max(0, (x - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

function scaleEasy(x) {
  const inMin = 0;
  const inMax = 6000;
  const outMin = 2;
  const outMax = 4;

  const t = Math.min(1, Math.max(0, (x - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}