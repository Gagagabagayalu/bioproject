let popSize = 200;
let distribution = 'random';
let trapExperience = 'neutral';
let seeAll = true;
let showCI = true;
let showHeat = false;
let method = 'lp';
let trapSize = 'large';

let voles = [];
let traps = [];
let trapOpen = false;

let running = false;
let collisionIter = 3;

let records = [];
let lastEstimate = null;

let batchResults = [];
let ciHits = 0;
let ciTotal = 0;

let obstacles = [];

const BOIDS = {
  random:  { radius: 4, maxSpeed: 1.1, sepWeight: 0.0, aliWeight: 0.0, cohWeight: 0.0, wanderStrength: 0.08 },
  clumped: { radius: 3, maxSpeed: 1.2, sepWeight: 1.8, aliWeight: 0.7, cohWeight: 0.5, wanderStrength: 0.06 },
  uniform: { radius: 5, maxSpeed: 1.1, sepWeight: 1.5, aliWeight: 0.05, cohWeight: 0.15, wanderStrength: 0.02 }
};

const PERCEPTION = 70;
const DESIRED_DIST = 90;

const TRAP_SIZES = {
  large: { size: 180, capacity: 120 },
  small: { size: 80,  capacity: 30  }
};

const CLUMPED_SPLIT_BASE  = 0.002;
const CLUMPED_SPLIT_CROWD = 0.006;