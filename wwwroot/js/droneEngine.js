window.DroneWars = {
    canvas: null, engine: null, scene: null, drone: null, searchlight: null, camera: null,
    moveSpeed: 0.18, rotateSpeed: 0.05,
    basePos: new BABYLON.Vector3(-140, 0.2, -140),
    strikers: [],
    waypoints: [
        new BABYLON.Vector3(45, 10, 45), new BABYLON.Vector3(-45, 12, 45),
        new BABYLON.Vector3(-45, 10, -45), new BABYLON.Vector3(45, 11, -45)
    ],
    currentWaypointIndex: 0,
    scanRadius: 20.0,
    detectedPOIs: new Set(),
    isPatrolling: false,
    intervalPulse: null,
    dotNetHelper: null,

    init: function (canvasId, dotNetHelper) {
        this.canvas = document.getElementById(canvasId);
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.dotNetHelper = dotNetHelper;
        this.createScene();
        this.engine.runRenderLoop(() => { this.update(); this.scene.render(); });
        this.startHeartbeatPulse();
        window.addEventListener("resize", () => this.engine.resize());
        console.log("TACTICAL ENGINE INITIALIZED. FORWARD OPERATING BASE ALPHA ONLINE.");
    },

    startHeartbeatPulse: function() {
        if (this.intervalPulse) clearInterval(this.intervalPulse);
        this.intervalPulse = setInterval(() => {
            if (this.dotNetHelper && this.drone) {
                const poisFound = this.scene.meshes.filter(m => m.metadata && m.metadata.type === "poi").length;
                const status = `Alt: ${this.drone.position.y.toFixed(1)} | POIs: ${poisFound} | Strikers: ${this.strikers.length}`;
                this.dotNetHelper.invokeMethodAsync("OnSystemCheck", status);
            }
        }, 2000); 
    },

    createScene: function () {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color3(0.8, 0.5, 0.2);
        this.scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 300, height: 300 }, this.scene);
        const sandMat = new BABYLON.StandardMaterial("sand", this.scene);
        sandMat.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/sand.jpg", this.scene);
        sandMat.diffuseTexture.uScale = 50; sandMat.diffuseTexture.vScale = 50;
        ground.material = sandMat;
        this.camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 120, new BABYLON.Vector3(0, 0, 0), this.scene);
        this.camera.attachControl(this.canvas, true);
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 1.0; light.diffuse = new BABYLON.Color3(1.0, 0.9, 0.7); 

        this.buildViperDrone();
        this.searchlight = new BABYLON.SpotLight("searchlight", new BABYLON.Vector3(0, -0.3, 0.8), new BABYLON.Vector3(0, -1, 0.3), Math.PI / 3, 2, this.scene);
        this.searchlight.parent = this.drone; this.searchlight.intensity = 2.0;
        this.buildBaseAlpha();

        this.createPOI("APEX_T_01", new BABYLON.Vector3(50, 0.5, 50), "heavy_tank", "EXTREME", "SCRAMBLED");
        this.createPOI("APEX_T_02", new BABYLON.Vector3(-55, 0.5, 60), "heavy_tank", "EXTREME", "SCRAMBLED");
        this.createPOI("APEX_T_03", new BABYLON.Vector3(0, 0.5, -60), "heavy_tank", "EXTREME", "SCRAMBLED");
    },

    buildBaseAlpha: function() {
        const root = new BABYLON.TransformNode("fob_alpha", this.scene);
        root.position = this.basePos;
        const metalMat = new BABYLON.StandardMaterial("bMetal", this.scene); metalMat.diffuseColor = new BABYLON.Color3(0.2, 0.15, 0.1);
        const base = BABYLON.MeshBuilder.CreateBox("base", { width: 12, height: 0.1, depth: 12 }, this.scene);
        base.parent = root; base.material = metalMat;
        const hub = BABYLON.MeshBuilder.CreateCylinder("hub", { height: 2, diameter: 4 }, this.scene);
        hub.parent = root; hub.position.y = 1.0; 
        const tower = BABYLON.MeshBuilder.CreateCylinder("tower", { height: 2.5, diameter: 0.1 }, this.scene);
        tower.parent = hub; tower.position.y = 1.5;
        const dish = BABYLON.MeshBuilder.CreateCylinder("dish", { diameter: 1, height: 0.2 }, this.scene);
        dish.parent = tower; dish.position.y = 1.0; dish.rotation.x = 1.0;
        this.scene.onBeforeRenderObservable.add(() => { dish.rotation.y += 0.05; });
    },

    buildViperDrone: function() {
        this.drone = new BABYLON.TransformNode("drone_scout", this.scene);
        this.drone.position = new BABYLON.Vector3(0, 10, 0);
        const fus = BABYLON.MeshBuilder.CreateCapsule("fus", { radius: 0.7, height: 4.0 }, this.scene);
        fus.parent = this.drone; fus.rotation.x = Math.PI / 2;
        const blades = BABYLON.MeshBuilder.CreateBox("blades", { width: 5.0, height: 0.05, depth: 0.2 }, this.scene);
        blades.parent = this.drone; blades.position.y = 1.0;
        this.scene.onBeforeRenderObservable.add(() => { blades.rotation.y += 0.5; });
    },

    buildRustDrone: function(id, pos) {
        const root = new BABYLON.TransformNode(id + "_root", this.scene);
        root.position = pos;
        
        // RECOVERY: High-Intensity White Emissive for perfect visibility (Chance 2/2)
        const whiteGlow = new BABYLON.StandardMaterial(id + "_glow", this.scene);
        whiteGlow.emissiveColor = new BABYLON.Color3(1, 1, 1);
        whiteGlow.diffuseColor = new BABYLON.Color3(1, 1, 1);

        const body = BABYLON.MeshBuilder.CreateBox("body", { width: 2, height: 1, depth: 2 }, this.scene);
        body.parent = root; body.material = whiteGlow;
        body.scaling.set(1.5, 1, 1.5); 

        const searchlight = new BABYLON.PointLight(id + "_light", new BABYLON.Vector3(0, 0.5, 0), this.scene);
        searchlight.parent = body;
        searchlight.intensity = 5.0;
        searchlight.diffuse = new BABYLON.Color3(0, 0.8, 1);

        console.log("STRIKER MANIFESTED: ", id);
        return root;
    },

    launchAttackDrone: function (targetId) {
        const strikerId = "striker_" + Math.random().toString(36).substr(2, 5);
        const root = this.buildRustDrone(strikerId, this.basePos.clone());
        root.position.y = 5.0; // Higher start to be visible
        this.strikers.push({ id: strikerId, root: root, targetId: targetId, state: "LAUNCHING", speed: 0.4 });
        console.warn("STRIKER LAUNCHED FROM FOB ALPHA TOWARDS " + targetId);
    },

    resetSensors: function() { this.detectedPOIs.clear(); },
    setPatrol: function(active) { this.isPatrolling = active; },

    update: function () {
        if (!this.drone) return;
        const scoutTarget = this.waypoints[this.currentWaypointIndex];
        const distToScoutTarget = BABYLON.Vector3.Distance(this.drone.position, scoutTarget);
        if (distToScoutTarget > 1.0) {
            const dir = scoutTarget.subtract(this.drone.position).normalize();
            this.drone.position.addInPlace(dir.scale(this.moveSpeed));
            this.drone.rotation.y += (Math.atan2(dir.x, dir.z) - this.drone.rotation.y) * this.rotateSpeed;
        } else { this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length; }
        
        this.scanForPOIs();

        // UPDATE STRIKERS
        for (let i = this.strikers.length - 1; i >= 0; i--) {
            const s = this.strikers[i];
            const targetRoot = this.scene.getNodeByName(s.targetId + "_root"); 

            if (s.state === "LAUNCHING") {
                s.root.position.y += 0.15;
                if (s.root.position.y >= 15) s.state = "INTERCEPTING";
            } else if (s.state === "INTERCEPTING") {
                if (!targetRoot) { s.state = "RECOVERING"; continue; }
                const targetPos = targetRoot.position;
                const dist = BABYLON.Vector3.Distance(s.root.position, targetPos);
                
                if (dist > 2.0) {
                    const dir = targetPos.subtract(s.root.position).normalize();
                    s.root.position.addInPlace(dir.scale(s.speed));
                    s.root.lookAt(targetPos);
                } else {
                    console.error("STRIKER IMPACT RECORDED: " + s.targetId);
                    this.createExplosion(targetPos);
                    
                    // RECOVERY: ABSOLUTE SECTOR PURGE (Purge by Name Prefix)
                    this.scene.meshes.filter(m => m.name.indexOf(s.targetId) !== -1).forEach(m => m.dispose());
                    this.scene.transformNodes.filter(t => t.name.indexOf(s.targetId) !== -1).forEach(t => t.dispose());
                    targetRoot.dispose();
                    
                    s.state = "RECOVERING";
                }
            } else if (s.state === "RECOVERING") {
                const distToBase = BABYLON.Vector3.Distance(s.root.position, this.basePos);
                if (distToBase > 4.0) {
                    const dir = this.basePos.add(new BABYLON.Vector3(0, 5, 0)).subtract(s.root.position).normalize();
                    s.root.position.addInPlace(dir.scale(s.speed));
                    s.root.lookAt(this.basePos);
                } else {
                    console.warn("STRIKER RECOVERED BY FOB ALPHA: " + s.id);
                    s.root.dispose();
                    this.strikers.splice(i, 1);
                }
            }
        }
    },

    scanForPOIs: function () {
        this.scene.meshes.forEach(m => {
            if (m.metadata && m.metadata.type === "poi") {
                const targetPos = m.absolutePosition || m.position;
                const dist = BABYLON.Vector3.Distance(this.drone.position, targetPos);
                if (dist < this.scanRadius && !this.detectedPOIs.has(m.metadata.id)) {
                    this.detectedPOIs.add(m.metadata.id);
                    if (this.dotNetHelper) this.dotNetHelper.invokeMethodAsync("OnPOIDetected", JSON.stringify(m.metadata));
                }
            }
        });
    },

    createExplosion: function (pos) {
        const explosion = new BABYLON.ParticleSystem("explosion", 500, this.scene);
        explosion.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        explosion.emitter = pos;
        explosion.minSize = 1.0; explosion.maxSize = 5.0;
        explosion.targetStopDuration = 1.0;
        explosion.start();
    },

    createPOI: function(id, pos, shape, heat, signal) {
        if (shape === "heavy_tank") return this.createHeavyTank(id, pos);
        let mesh = BABYLON.MeshBuilder.CreateBox(id, { size: 1.5 }, this.scene);
        mesh.position = pos;
        mesh.metadata = { id, type: "poi", shape, heat, signal, pos: [pos.x, pos.y, pos.z] };
        return mesh;
    },

    createHeavyTank: function(id, pos) {
        const root = new BABYLON.TransformNode(id + "_root", this.scene);
        root.position = pos;
        const metalMat = new BABYLON.StandardMaterial(id + "_tankMat", this.scene);
        metalMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        const chassis = BABYLON.MeshBuilder.CreateBox(id + "_chassis", { width: 3.5, height: 1.0, depth: 6.5 }, this.scene);
        chassis.parent = root; chassis.position.y = 0.5; chassis.material = metalMat;
        const turret = BABYLON.MeshBuilder.CreateBox(id + "_turret", { width: 3.2, height: 1.2, depth: 4.5 }, this.scene);
        turret.parent = root; turret.position.y = 1.6; turret.position.z = -1.0; turret.material = metalMat;
        const barrel = BABYLON.MeshBuilder.CreateCylinder(id + "_barrel", { height: 6.0, diameter: 0.4 }, this.scene);
        barrel.parent = turret; barrel.rotation.x = Math.PI / 2; barrel.position.z = 3.0; barrel.position.y = 0.1;
        barrel.material = metalMat;
        root.metadata = { id, type: "poi", shape: "Heavy_Tank", heat: "EXTREME", signal: "SCRAMBLED", pos: [pos.x, pos.y, pos.z] };
        const triggerBox = BABYLON.MeshBuilder.CreateBox(id, { size: 5 }, this.scene);
        triggerBox.parent = root; triggerBox.visibility = 0; triggerBox.metadata = root.metadata;
        console.log("HEAVY TANK DEPLOYED: ", id);
        return root;
    }
};
