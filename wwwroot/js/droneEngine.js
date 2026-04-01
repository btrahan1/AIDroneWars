window.DroneWars = {
    canvas: null,
    engine: null,
    scene: null,
    camera: null,
    drone: null,
    dotNetHelper: null,
    isMoving: false,
    moveSpeed: 0.15,
    rotateSpeed: 0.05,
    waypoints: [
        new BABYLON.Vector3(15, 5, 15),
        new BABYLON.Vector3(-15, 8, 15),
        new BABYLON.Vector3(-15, 6, -15),
        new BABYLON.Vector3(15, 7, -15)
    ],
    currentWaypointIndex: 0,
    scanRadius: 20.0,
    detectedPOIs: new Set(),
    isEngaging: false,
    engagementTarget: null,

    resetSensors: function() {
        this.detectedPOIs.clear();
        console.log("SENSOR MEMORY CLEARED: Re-initiating tactical surveillance.");
    },

    init: function (canvasId, dotNetHelper) {
        this.canvas = document.getElementById(canvasId);
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.dotNetHelper = dotNetHelper;

        this.createScene();

        this.engine.runRenderLoop(() => {
            if (this.scene) {
                this.updateDrone();
                this.scene.render();
            }
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        console.log("DroneWars Tactical Engine Initialized.");
    },

    createScene: function () {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.03, 1);

        // Tactical Skybox-ish grid
        const helper = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 100,
            groundColor: new BABYLON.Color3(0.05, 0.05, 0.1),
            enableGroundMirror: false,
            createSkybox: false
        });

        this.camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 40, new BABYLON.Vector3(0, 0, 0), this.scene);
        this.camera.attachControl(this.canvas, true);

        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.8;

        // Create Drone (Advanced Tactical Model)
        this.drone = BABYLON.MeshBuilder.CreateBox("drone", { width: 1.2, height: 0.3, depth: 1.2 }, this.scene);
        this.drone.position = new BABYLON.Vector3(0, 5, 0);
        const droneMat = new BABYLON.StandardMaterial("droneMat", this.scene);
        droneMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.3);
        droneMat.emissiveColor = new BABYLON.Color3(0, 0.8, 1);
        this.drone.material = droneMat;

        // Radar Dome (Visual)
        this.radarDome = BABYLON.MeshBuilder.CreateSphere("radarDome", { diameter: this.scanRadius * 2 }, this.scene);
        this.radarDome.parent = this.drone;
        const radarMat = new BABYLON.StandardMaterial("radarMat", this.scene);
        radarMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        radarMat.alpha = 0.05;
        radarMat.wireframe = true;
        this.radarDome.material = radarMat;

        // Create Waypoint Markers (Visual aids)
        this.waypoints.forEach((wp, i) => {
            const mark = BABYLON.MeshBuilder.CreateTorus("wp_" + i, { diameter: 1.5, thickness: 0.1 }, this.scene);
            mark.position = wp;
            const mMat = new BABYLON.StandardMaterial("wpMat_" + i, this.scene);
            mMat.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            mark.material = mMat;
        });

        // Create Random POIs with Signatures
        this.createPOI("ALPHA_01", new BABYLON.Vector3(12, 0.5, 12), "cube", "HIGH_HEAT", "STABLE_SIGNAL");
        this.createPOI("BRAVO_02", new BABYLON.Vector3(-10, 0.5, 8), "sphere", "LOW_HEAT", "SCRAMBLED_SIGNAL");
        this.createPOI("ZULU_99", new BABYLON.Vector3(0, 0.5, -12), "cylinder", "EXTREME_HEAT", "SCRAMBLED_SIGNAL");

        // NEW: Endless Tactical Cycle
        setInterval(() => {
            if (this.scene) {
                const id = "NEW_SIG_" + Math.floor(Math.random() * 9000 + 1000);
                const x = (Math.random() * 40) - 20;
                const z = (Math.random() * 40) - 20;
                const shapes = ["cube", "sphere", "cylinder"];
                const heats = ["LOW", "HIGH", "EXTREME"];
                const signals = ["STABLE", "SCRAMBLED"];
                
                this.createPOI(id, new BABYLON.Vector3(x, 0.5, z), 
                    shapes[Math.floor(Math.random() * 3)], 
                    heats[Math.floor(Math.random() * 3)], 
                    signals[Math.floor(Math.random() * 2)]
                );
                console.log("TACTICAL ALERT: New signature infiltrated sector.");
            }
        }, 20000); // New target every 20 seconds for high-action
    },

    createPOI: function(id, pos, shape, heat, signal) {
        let mesh;
        if (shape === "cube") mesh = BABYLON.MeshBuilder.CreateBox(id, { size: 1.5 }, this.scene);
        else if (shape === "sphere") mesh = BABYLON.MeshBuilder.CreateSphere(id, { diameter: 1.5 }, this.scene);
        else mesh = BABYLON.MeshBuilder.CreateCylinder(id, { height: 2, diameter: 1 }, this.scene);

        mesh.position = pos;
        mesh.metadata = { 
            id: id, 
            type: "poi", 
            shape: shape,
            heat: heat,
            signal: signal,
            pos: [pos.x, pos.y, pos.z]
        };

        const mat = new BABYLON.StandardMaterial(id + "Mat", this.scene);
        mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        mesh.material = mat;
    },

    updateDrone: function() {
        if (!this.drone) return;

        if (this.isEngaging && this.engagementTarget) {
            this.moveToTarget(this.engagementTarget.position);
            // If very close, trigger engagement
            if (BABYLON.Vector3.Distance(this.drone.position, this.engagementTarget.position) < 2.0) {
                this.executeStrike();
            }
        } else {
            const target = this.waypoints[this.currentWaypointIndex];
            this.moveToTarget(target);

            if (BABYLON.Vector3.Distance(this.drone.position, target) < 1.0) {
                this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
            }
        }

        this.scanForPOIs();
    },

    moveToTarget: function(target) {
        const diff = target.subtract(this.drone.position);
        const distance = diff.length();
        if (distance < 0.1) return;

        const dir = diff.normalize();
        this.drone.position.addInPlace(dir.scale(this.moveSpeed));

        // Smooth Rotation
        const targetRotation = Math.atan2(dir.x, dir.z);
        this.drone.rotation.y += (targetRotation - this.drone.rotation.y) * this.rotateSpeed;
    },

    scanForPOIs: function() {
        let meshesInScene = this.scene.meshes.length;
        let poisFound = this.scene.meshes.filter(m => m.metadata && m.metadata.type === "poi").length;

        // HEARTBEAT periodically (approx every 8 seconds @ 60fps)
        if (Math.random() < 0.002) {
            this.dotNetHelper.invokeMethodAsync("OnSystemCheck", `Alt: ${this.drone.position.y.toFixed(1)} | Obj: ${meshesInScene} | POIs: ${poisFound}`);
        }

        this.scene.meshes.forEach(m => {
            if (m.metadata && m.metadata.type === "poi") {
                const dist = BABYLON.Vector3.Distance(this.drone.position, m.position);
                if (dist < this.scanRadius && !this.detectedPOIs.has(m.metadata.id)) {
                    console.log("SURVEILLANCE HIT: ", m.metadata.id, " DIST: ", dist.toFixed(2));
                    this.detectedPOIs.add(m.metadata.id);
                    this.dotNetHelper.invokeMethodAsync("OnPOIDetected", JSON.stringify(m.metadata));
                }
            }
        });
    },

    engageTarget: function(targetId) {
        const target = this.scene.getMeshByName(targetId);
        if (target) {
            this.engagementTarget = target;
            this.isEngaging = true;
            console.log("ENGAGING TARGET: ", targetId);
        }
    },

    executeStrike: function() {
        if (!this.engagementTarget) return;

        // Particle Explosion
        const explosion = new BABYLON.ParticleSystem("explosion", 200, this.scene);
        explosion.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        explosion.emitter = this.engagementTarget.position;
        explosion.minSize = 0.5;
        explosion.maxSize = 2.0;
        explosion.targetStopDuration = 0.5;
        explosion.start();

        console.log("TARGET DISMANTLED: ", this.engagementTarget.name);
        this.engagementTarget.dispose();
        
        this.isEngaging = false;
        this.engagementTarget = null;
    }
};
