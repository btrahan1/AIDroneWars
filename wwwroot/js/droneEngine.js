window.DroneWars = {
    canvas: null,
    engine: null,
    scene: null,
    drone: null,
    camera: null,
    moveSpeed: 0.18, 
    rotateSpeed: 0.05,
    waypoints: [
        new BABYLON.Vector3(45, 10, 45),
        new BABYLON.Vector3(-45, 12, 45),
        new BABYLON.Vector3(-45, 10, -45),
        new BABYLON.Vector3(45, 11, -45)
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
            this.update();
            this.scene.render();
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    },

    createScene: function () {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

        // Tactical Skybox-ish grid
        this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 300,
            groundColor: new BABYLON.Color3(0.05, 0.05, 0.1),
            enableGroundMirror: false,
            createSkybox: false
        });

        this.camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 120, new BABYLON.Vector3(0, 0, 0), this.scene);
        this.camera.attachControl(this.canvas, true);

        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 1.0; 

        // BUILD VIPER DRONE
        this.buildViperDrone();

        // SEARCHLIGHT MOUNTED ON DRONE (AFTER CREATION)
        this.searchlight = new BABYLON.SpotLight("searchlight", new BABYLON.Vector3(0, -0.3, 0.8), new BABYLON.Vector3(0, -1, 0.3), Math.PI / 3, 2, this.scene);
        this.searchlight.parent = this.drone;
        this.searchlight.intensity = 2.0;
        this.searchlight.diffuse = new BABYLON.Color3(0, 0.9, 1);

        // Radar Dome (Visual)
        this.radarDome = BABYLON.MeshBuilder.CreateSphere("radarDome", { diameter: this.scanRadius * 2 }, this.scene);
        this.radarDome.parent = this.drone;
        const radarMat = new BABYLON.StandardMaterial("radarMat", this.scene);
        radarMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        radarMat.alpha = 0.05;
        radarMat.wireframe = true;
        this.radarDome.material = radarMat;

        // Waypoint Markers
        this.waypoints.forEach((wp, i) => {
            const mark = BABYLON.MeshBuilder.CreateBox("wp_" + i, { size: 0.5 }, this.scene);
            mark.position = wp;
            const mMat = new BABYLON.StandardMaterial("mMat", this.scene);
            mMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
            mMat.alpha = 0.1;
            mark.material = mMat;
        });

        // Initial POIs
        this.createPOI("ALPHA_01", new BABYLON.Vector3(40, 0.5, 40), "cube", "HIGH_HEAT", "STABLE_SIGNAL");
        this.createPOI("BRAVO_02", new BABYLON.Vector3(-30, 0.5, 30), "sphere", "LOW_HEAT", "STABLE_SIGNAL");
        this.createPOI("ZULU_99", new BABYLON.Vector3(0, 0.5, -40), "cylinder", "EXTREME_HEAT", "SCRAMBLED_SIGNAL");

        // Heavy Tank Platoon
        this.createPOI("APEX_T_01", new BABYLON.Vector3(50, 0.5, 50), "heavy_tank", "EXTREME", "SCRAMBLED");
        this.createPOI("APEX_T_02", new BABYLON.Vector3(-55, 0.5, 60), "heavy_tank", "EXTREME", "SCRAMBLED");
        this.createPOI("APEX_T_03", new BABYLON.Vector3(0, 0.5, -60), "heavy_tank", "EXTREME", "SCRAMBLED");

        // Endless Spawner
        setInterval(() => {
            if (this.scene) {
                const id = "NEW_SIG_" + Math.floor(Math.random() * 9000 + 1000);
                const x = (Math.random() * 120) - 60;
                const z = (Math.random() * 120) - 60;
                const shapes = ["cube", "sphere", "cylinder", "heavy_tank"];
                const type = shapes[Math.floor(Math.random() * shapes.length)];
                this.createPOI(id, new BABYLON.Vector3(x, 0.5, z), type, "EXTREME", "SCRAMBLED");
            }
        }, 20000);
    },

    buildViperDrone: function() {
        this.drone = new BABYLON.TransformNode("drone_viper", this.scene);
        this.drone.position = new BABYLON.Vector3(0, 10, 0);

        const metalMat = new BABYLON.StandardMaterial("vMetal", this.scene);
        metalMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        metalMat.emissiveColor = new BABYLON.Color3(0, 0.2, 0.4);

        const plasticMat = new BABYLON.StandardMaterial("vPlastic", this.scene);
        plasticMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        const glowMat = new BABYLON.StandardMaterial("vGlow", this.scene);
        glowMat.emissiveColor = new BABYLON.Color3(0, 0.8, 1);

        // Fuselage
        const fuselage = BABYLON.MeshBuilder.CreateCapsule("fuselage", { radius: 0.7, height: 4.0 }, this.scene);
        fuselage.parent = this.drone;
        fuselage.rotation.x = Math.PI / 2;
        fuselage.material = metalMat;

        // Tail Boom
        const boom = BABYLON.MeshBuilder.CreateCylinder("boom", { height: 2.2, diameter: 0.3 }, this.scene);
        boom.parent = this.drone;
        boom.position.z = -1.8;
        boom.position.y = 0.1;
        boom.rotation.x = Math.PI / 2;
        boom.material = metalMat;

        // Main Rotor
        const shaft = BABYLON.MeshBuilder.CreateCylinder("shaft", { height: 0.5, diameter: 0.1 }, this.scene);
        shaft.parent = this.drone;
        shaft.position.y = 0.5;
        shaft.material = plasticMat;

        const blades = BABYLON.MeshBuilder.CreateBox("blades", { width: 5.0, height: 0.05, depth: 0.2 }, this.scene);
        blades.parent = shaft;
        blades.position.y = 0.2;
        blades.material = plasticMat;

        // Tail Rotor
        const tShaft = BABYLON.MeshBuilder.CreateCylinder("tShaft", { height: 0.2, diameter: 0.1 }, this.scene);
        tShaft.parent = boom;
        tShaft.position.y = -1.0;
        tShaft.position.x = 0.2;
        tShaft.rotation.z = Math.PI / 2;
        tShaft.material = plasticMat;

        const tBlades = BABYLON.MeshBuilder.CreateBox("tBlades", { width: 0.8, height: 0.05, depth: 0.1 }, this.scene);
        tBlades.parent = tShaft;
        tBlades.material = plasticMat;

        // Sensor
        const sensor = BABYLON.MeshBuilder.CreateSphere("sensor", { diameter: 0.4 }, this.scene);
        sensor.parent = this.drone;
        sensor.position.y = -0.3;
        sensor.position.z = 0.8;
        sensor.material = plasticMat;

        this.vEye = BABYLON.MeshBuilder.CreateSphere("eye", { diameter: 0.15 }, this.scene);
        this.vEye.parent = sensor;
        this.vEye.position.z = 0.15;
        this.vEye.material = glowMat;

        // Weapon Pylons
        const pylonL = BABYLON.MeshBuilder.CreateBox("pylonL", { width: 0.6, height: 0.1, depth: 0.3 }, this.scene);
        pylonL.parent = this.drone;
        pylonL.position = new BABYLON.Vector3(0.6, -0.1, 0);
        pylonL.material = metalMat;

        const pylonR = BABYLON.MeshBuilder.CreateBox("pylonR", { width: 0.6, height: 0.1, depth: 0.3 }, this.scene);
        pylonR.parent = this.drone;
        pylonR.position = new BABYLON.Vector3(-0.6, -0.1, 0);
        pylonR.material = metalMat;

        // Skids
        const skidL = BABYLON.MeshBuilder.CreateBox("skidL", { width: 0.1, height: 0.1, depth: 2.2 }, this.scene);
        skidL.parent = this.drone;
        skidL.position = new BABYLON.Vector3(0.5, -1.0, 0);
        skidL.material = metalMat;

        const skidR = BABYLON.MeshBuilder.CreateBox("skidR", { width: 0.1, height: 0.1, depth: 2.2 }, this.scene);
        skidR.parent = this.drone;
        skidR.position = new BABYLON.Vector3(-0.5, -1.0, 0);
        skidR.material = metalMat;

        // Animations
        this.scene.onBeforeRenderObservable.add(() => {
            blades.rotation.y += 0.5;
            tBlades.rotation.y += 0.8;
        });
    },

    update: function () {
        if (!this.drone) return;

        if (this.isEngaging && this.engagementTarget) {
            const targetPos = this.engagementTarget.absolutePosition || this.engagementTarget.position;
            const dist = BABYLON.Vector3.Distance(this.drone.position, targetPos);
            
            if (dist > 1.5) {
                const dir = targetPos.subtract(this.drone.position).normalize();
                this.drone.position.addInPlace(dir.scale(this.moveSpeed * 2.5));
                this.drone.lookAt(targetPos);
                this.drone.rotation.x = Math.PI / 4; 

                if (this.vEye.material) {
                    this.vEye.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
                }
                // Brighten searchlight during dive
                if (this.searchlight) {
                    this.searchlight.intensity = 4.0;
                    this.searchlight.diffuse = new BABYLON.Color3(1, 0, 0);
                }
            } else {
                this.createExplosion(targetPos);
                this.engagementTarget.dispose(); 
                this.isEngaging = false;
                this.engagementTarget = null;
                
                this.drone.rotation.x = 0; 
                if (this.vEye.material) {
                    this.vEye.material.emissiveColor = new BABYLON.Color3(0, 0.8, 1);
                }
                // Restore searchlight
                if (this.searchlight) {
                    this.searchlight.intensity = 2.0;
                    this.searchlight.diffuse = new BABYLON.Color3(0, 0.9, 1);
                }
            }
        } else {
            const target = this.waypoints[this.currentWaypointIndex];
            const dist = BABYLON.Vector3.Distance(this.drone.position, target);

            if (dist > 1.0) {
                const dir = target.subtract(this.drone.position).normalize();
                this.drone.position.addInPlace(dir.scale(this.moveSpeed));
                const targetRotation = Math.atan2(dir.x, dir.z);
                this.drone.rotation.y += (targetRotation - this.drone.rotation.y) * this.rotateSpeed;
            } else {
                this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
            }
            this.scanForPOIs();
        }
    },

    engageTarget: function (targetId) {
        if (this.isEngaging) return;
        const target = this.scene.getNodeByName(targetId + "_root") || this.scene.getMeshByName(targetId);
        if (target) {
            this.isEngaging = true;
            this.engagementTarget = target;
        }
    },

    createExplosion: function (pos) {
        const explosion = new BABYLON.ParticleSystem("explosion", 200, this.scene);
        explosion.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        explosion.emitter = pos;
        explosion.minSize = 0.5;
        explosion.maxSize = 2.5;
        explosion.targetStopDuration = 0.5;
        explosion.start();
        console.log("STRIKE CONFIRMED AT: ", pos);
    },

    createPOI: function(id, pos, shape, heat, signal) {
        if (shape === "heavy_tank") {
            return this.createHeavyTank(id, pos);
        }

        let mesh;
        if (shape === "cube") mesh = BABYLON.MeshBuilder.CreateBox(id, { size: 1.5 }, this.scene);
        else if (shape === "sphere") mesh = BABYLON.MeshBuilder.CreateSphere(id, { diameter: 1.5 }, this.scene);
        else mesh = BABYLON.MeshBuilder.CreateCylinder(id, { height: 1.5, diameter: 1.5 }, this.scene);
        
        mesh.position = pos;
        mesh.metadata = { id, type: "poi", shape, heat, signal, pos: [pos.x, pos.y, pos.z] };

        const mat = new BABYLON.StandardMaterial(id + "_mat", this.scene);
        mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        mesh.material = mat;
        return mesh;
    },

    createHeavyTank: function(id, pos) {
        const root = new BABYLON.TransformNode(id + "_root", this.scene);
        root.position = pos;

        const metalMat = new BABYLON.StandardMaterial(id + "_metalMat", this.scene);
        metalMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        const chassis = BABYLON.MeshBuilder.CreateBox(id + "_chassis", { width: 3.5, height: 1.0, depth: 6.5 }, this.scene);
        chassis.parent = root;
        chassis.position.y = 0.5;
        chassis.material = metalMat;

        const turret = BABYLON.MeshBuilder.CreateBox(id + "_turret", { width: 3.2, height: 1.2, depth: 4.5 }, this.scene);
        turret.parent = root;
        turret.position.y = 1.6;
        turret.position.z = -1.0;
        turret.material = metalMat;

        const barrel = BABYLON.MeshBuilder.CreateCylinder(id + "_barrel", { height: 6.0, diameter: 0.4 }, this.scene);
        barrel.parent = turret;
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = 3.0;
        barrel.position.y = 0.1;
        barrel.material = metalMat;

        root.metadata = { id, type: "poi", shape: "Heavy_Tank", heat: "EXTREME", signal: "SCRAMBLED", pos: [pos.x, pos.y, pos.z], isElite: true };

        let angle = 0;
        this.scene.onBeforeRenderObservable.add(() => {
            angle += 0.01;
            turret.rotation.y = Math.sin(angle) * 0.4;
        });

        const triggerBox = BABYLON.MeshBuilder.CreateBox(id, { size: 5 }, this.scene);
        triggerBox.parent = root;
        triggerBox.visibility = 0;
        triggerBox.metadata = root.metadata;

        return root;
    },

    scanForPOIs: function () {
        let meshesInScene = this.scene.meshes.length;
        let poisFound = this.scene.meshes.filter(m => m.metadata && m.metadata.type === "poi").length;

        if (Math.random() < 0.002) {
            this.dotNetHelper.invokeMethodAsync("OnSystemCheck", `Alt: ${this.drone.position.y.toFixed(1)} | Obj: ${meshesInScene} | POIs: ${poisFound}`);
        }

        this.scene.meshes.forEach(m => {
            if (m.metadata && m.metadata.type === "poi") {
                const targetPos = m.absolutePosition || m.position;
                const dist = BABYLON.Vector3.Distance(this.drone.position, targetPos);
                if (dist < this.scanRadius && !this.detectedPOIs.has(m.metadata.id)) {
                    this.detectedPOIs.add(m.metadata.id);
                    this.dotNetHelper.invokeMethodAsync("OnPOIDetected", JSON.stringify(m.metadata));
                }
            }
        });
    }
};
