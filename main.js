//-------------------GLobals--------------------------
var G_holders = {};
var INV_AB = {};
//-------------------end of Globals--------------------------

//-------------------constants--------------------------
const ABILITIES = {
    'work': WORK,
    'move': MOVE,
    'carry': CARRY,
    'attack': ATTACK,
    'ranged_attack': RANGED_ATTACK,
    'heal': HEAL,
    'claim': CLAIM,
    'tough': TOUGH,
};
const LINK = {
    WORK: WORK,
    MOVE: MOVE,
    CARRY: CARRY,
    ATTACK: ATTACK,
    RANGED_ATTACK: RANGED_ATTACK,
    HEAL: HEAL,
    CLAIM: CLAIM,
    TOUGH: TOUGH,
};
//-------------------end of constants--------------------------

//-------------------tools--------------------------
function getNum(hid) {
    var ret = 0;
    for (var i=0;i<hid.length;i++) {
        ret += hid.charCodeAt(i)<<(8*i%17);
    }
    return ret;
}
function GetFunc(x) {
    return eval(x);
}
//------------------end of tools--------------------


//-------------------tasks--------------------------
function renew_check(self) {
    if (self.creep.ticksToLive < 10) return true;
    else return false;
}
function renew_init(self) {
    self.S = 'To';
}
function renew_action(self) {
    if (self.S=='To') {
        var spn = self.getSpn();
    }
}
var renew_task = {'name': 'renew', 'check': 'renew_check', 'action': 'renew_action', 'init': 'renew_init'};
//------------------end of tasks--------------------

//-------------------prototypes--------------------------

class Worker {
    
    recheck() {
        for (const i in ABILITIES) {
            this.creep.memory['ab_'+i] = 0;
        }
        for (const i in this.creep.body) {
            const typ = this.creep.body[i];
            if (typ.hits<=0) continue;
            // console.log(INV_AB[typ.type], typ.type);
            this.creep.memory['ab_'+INV_AB[typ.type]] += 1;
        }
    }
    
    init() {
        
    }
    
    constructor(creep) {
        this.creep = creep;
        if (!this.creep.memory.proto||this.creep.memory.force_init) {
            if (this.creep.id) {
                this.creep.memory.current_hits = this.creep.hits;
                this.creep.memory.state = 'N';
                this.recheck();
                this.init();
                this.creep.memory.ability = Worker.ability;
                this.creep.memory.tasks = Worker.priors;
                // console.log(Worker.ability, Worker.priors);
                this.creep.memory.force_init = false;
            }
            else {
                this.creep.memory.force_init = true;
            }
            this.creep.memory.proto = 'Worker';
        }
    }
    
    canDo() {
        if (!this.creep.id) return false;
        var ret = true;
        for (const i in this.creep.memory.ability) {
            if (this.creep.memory['ab_'+INV_AB[i]]<=0) {
                ret = false;
                break;
            }
        }
        return ret;
    }
    

    upgrade() {

    }
    
    recycle() {
        
    }
    
    getSrc() {
        var room = this.creep.room;
        const asrcs = room.find(FIND_SOURCES_ACTIVE);
        if (asrcs.length<=0) {
            return 0;
        }
        var preferred = getNum(this.creep.id) % asrcs.length;
        return asrcs[preferred];
    }
    
    getSpn() {
        var room = this.creep.room;
        const asrcs = room.find(FIND_MY_SPAWNS);
        if (asrcs.length<=0) {
            return 0;
        }
        var preferred = getNum(this.creep.id) % asrcs.length;
        return asrcs[preferred];
    }
    
    job() {
        
    }
    
    stateCheck() {
        for (const _ in this.creep.memory.tasks) {
            const i = this.creep.memory.tasks[_];
            if (GetFunc(i.check)(this)) {
                if (this.creep.memory.state!=i.name) {
                    this.creep.memory.state = i.name;
                    GetFunc(i.init)(this);
                }
                return false;
            }
        }
        if (this.creep.memory.state!='N') {
            this.init();
            this.creep.memory.state = 'N';
        }
        return true;
    }
    
    prior() {
        // console.log('prio');
        for (const _ in this.creep.memory.tasks) {
            var i = this.creep.memory.tasks[i];
            if (i.name==this.creep.memory.state) {
                return GetFunc(i.action)(this);
            }
        }
        return -1;
    }

    forward() {
        if (this.creep.spawning) return OK;
        if (this.creep.hits!=this.creep.memory.current_hits) {
            this.recheck();
            this.creep.memory.current_hits = this.creep.hits;
        }
        if (this.stateCheck()) {
            if (this.canDo()) {
                return this.job();
            } else {
                this.creep.say('E:no part');
                return -1;
            }
        } else {
            return this.prior();
        }
    }
    
};

Worker.ability = {
    WORK: 1,
    MOVE: 1,
    CARRY: 1
};
Worker.priors = [
    renew_task
];

class Miner extends Worker {
    
    init() {
        if (this.creep.store.getFreeCapacity()==0) {
            this.creep.memory.S = 'Spawn';
        } else {
            this.creep.memory.S = 'To';
        }
    }

    constructor(creep) {
        super(creep);
        this.creep.memory.proto = 'Miner';
        this.creep.memory.ability = Miner.ability;
        this.creep.memory.tasks = Miner.priors;
    }
    
    job() {
        // console.log(this.creep.memory.S);
        if (this.creep.memory.S=='To') {
            var src = this.getSrc();
            if (src==0) return;
            this.creep.moveTo(src.pos);
            if (this.creep.pos.isNearTo(src.pos)) {
                this.creep.memory.S = 'Harvest';
            }
        }
        else if (this.creep.memory.S=='Harvest') {
            var src = this.getSrc();
            if (src==0) return;
            this.creep.harvest(src);
            if (this.creep.store.getFreeCapacity()==0) {
                this.creep.memory.S = 'Spawn';
            }
        }
        else if (this.creep.memory.S=='Spawn') {
            var spn = this.getSpn();
            if (spn==0) return;
            this.creep.moveTo(spn.pos);
             if (this.creep.pos.isNearTo(spn.pos)) {
                this.creep.memory.S = 'Deposit';
            }
        }
        else if (this.creep.memory.S=='Deposit') {
            var spn = this.getSpn();
            if (spn==0) return;
            var ret = this.creep.transfer(spn, RESOURCE_ENERGY);
            if (ret==OK) {
                this.creep.memory.S = 'To';
            } else {
                this.creep.say('E:transfer');
                return -2;
            }
        }
        return OK;
    }
    
};

Miner.ability = {
    WORK: 3,
    MOVE: 1,
    CARRY: 1
};


class Builder extends Worker {
    
    constructor(creep) {
        super(creep);
        this.creep.memory.proto = 'Builder';
        this.creep.memory.ability = Builder.ability;
        this.creep.memory.tasks = Builder.priors;
    }
    
};

Builder.ability = {
    WORK: 1,
    MOVE: 1
};
    
class Soldier extends Worker {
    
    constructor(creep) {
        super(creep);
        this.creep.memory.proto = 'Soldier';
        this.creep.memory.ability = Soldier.ability;
        this.creep.memory.tasks = Soldier.priors;
    }
    
};

Soldier.ability = {
    ATTACK: 1,
    TOUGH: 1
};

//-------------------end of prototypes--------------------------

//-------------------strategies--------------------------

const RC_each_tick = function(room) {
    
}

function miner_check(room) {
    var crps = room.find(FIND_MY_CREEPS);
    var miner_cnt = 0;
    for (const i in crps) {
        var creep = crps[i];
        if (creep.memory.proto=='Miner') miner_cnt += 1;
    }
    console.log('miner cnt', miner_cnt);
    if (miner_cnt < room.find(FIND_SOURCES).length * 2) {
        var spns = room.find(FIND_MY_SPAWNS);
        for (const i in spns) {
            if (spns[i].store[RESOURCE_ENERGY]>=200) {
                var body = [];
                for (const b in Miner.ability) {
                    body.push(LINK[b]);
                }
                while (true) {
                    var nm = 'C_'+(Memory.crp_id++);
                    var ret = spns[i].spawnCreep(body, nm);
                    if (ret!=ERR_NAME_EXISTS) break;
                }
                if (ret==OK) {
                    miner_cnt += 1;
                    var creep = Game.creeps[nm];
                    var holder = new Miner(creep);
                    console.log('built miner.');
                    return;
                } else {
                    console.log('build miner error: ',ret, body, nm);
                }
            }      
        }
    }
};

const rc_list = [
    {'name': 'build_miner', 'step': 10, 'check_action': 'miner_check'},
];

const creep_jobs = {
    "Miner": Miner,
    "Builder": Builder,
    "Soldier": Soldier,
};

function reset() {
    console.log('Reseting...');
    Memory.crp_id = 0;
    for (const i in Game.creeps) {
        Game.creeps[i].memory = new Object();
        // var Job = getJob(Game.creeps[i]);
        // var holder = new creep_jobs[Job](Game.creeps[i]);
        var holder = new Miner(Game.creeps[i]);
    }
    for (const i in Game.spawns) {
        Game.spawns[i].memory = new Object();
    }
    for (const i in Game.rooms) {
        Game.rooms[i].memory = new Object();
        Game.rooms[i].memory.clock = 0;
        Game.rooms[i].memory.rc_list = [];
        for (const _ in rc_list) {
            const j = rc_list[_];
            Game.rooms[i].memory['rc_pre_'+j.name] = -100000000;
            Game.rooms[i].memory.rc_list.push(j);
        }

    }
}
//-------------------end of strategies--------------------------

//-------------------Room Control--------------------------

const RC = function(room) {
    room.memory.clock += 1;
    for (const _ in room.memory.rc_list) {
        const i = room.memory.rc_list[_];
        if (room.memory['rc_pre_'+i.name] + i.step <= room.memory.clock) {
            GetFunc(i.check_action)(room);
            room.memory['rc_pre_'+i.name] = room.memory.clock;
        }
    }
    RC_each_tick(room);
}

//-------------------end of RC--------------------------

//-------------------cmd--------------------------

function dealCmd() {
    if (Memory.cmds.reset) {
        reset();
        Memory.cmds.reset = 0;
    }
}
//-------------------end of cmd--------------------------

//-------------------main--------------------------
module.exports.loop = function () {
    for (const i in ABILITIES) {
        INV_AB[ABILITIES[i]] = i;
    }
    if (!Memory.cmds) {
        Memory.cmds = new Object();
    }
    dealCmd();
    for (const i in Game.rooms) {
        var room = Game.rooms[i];
        // console.log(room.name);
        RC(room);
    }
    G_holders = {};
    for (const i in Game.creeps) {
        var creep = Game.creeps[i];
        if (!creep.id) continue;
        if (creep.memory.proto) {
            const Job = eval(creep.memory.proto);
            // console.log(creep.memory.proto,Job);
            G_holders[creep.name] = new Job(creep);
        } else {
            creep.say('E:no job');
        }
    }
    for (const i in G_holders) {
        // console.log(i);
        var creep = G_holders[i];
        creep.forward();
    }
}

