window.DroneWars = {
    canvas: null, engine: null, scene: null, drone: null, searchlight: null, camera: null,
    moveSpeed: 0.18, rotateSpeed: 0.05,
    basePos: new BABYLON.Vector3(-140, 0, -140),
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
    instanceRegistry: {},

    SCHEMATICS: {
        BaseAlpha: {
            "Name": "MarsColonyBase_Alpha",
            "Timeline": [
                { "Target": "comms_dish", "Action": "Rotate", "Axis": "Y", "Speed": 0.05 },
                { "Target": "status_light", "Action": "Pulse", "Speed": 0.005, "Min": 1.0, "Max": 5.0 }
            ],
            "Parts": [
                { "Id": "base_foundation", "ParentId": null, "Shape": "Box", "Position": [0, -0.05, 0], "Rotation": [0, 0, 0], "Scale": [12, 0.1, 12], "ColorHex": "#332211", "Material": "Metal" },
                { "Id": "central_hub", "ParentId": null, "Shape": "Cylinder", "Position": [0, 1.0, 0], "Rotation": [0, 0, 0], "Scale": [4, 2, 4], "ColorHex": "#E0E0E0", "Material": "Plastic" },
                { "Id": "hub_dome_top", "ParentId": null, "Shape": "Sphere", "Position": [0, 2.0, 0], "Rotation": [0, 0, 0], "Scale": [4, 1.5, 4], "ColorHex": "#E0E0E0", "Material": "Plastic" },
                { "Id": "hab_corridor_l", "ParentId": null, "Shape": "Cylinder", "Position": [3.5, 0.5, 0], "Rotation": [0, 0, 90], "Scale": [1, 3, 1], "ColorHex": "#CCCCCC", "Material": "Metal" },
                { "Id": "hab_pod_l", "ParentId": null, "Shape": "Sphere", "Position": [5.5, 0.75, 0], "Rotation": [0, 0, 0], "Scale": [2.5, 1.5, 2.5], "ColorHex": "#FFFFFF", "Material": "Plastic" },
                { "Id": "hab_corridor_r", "ParentId": null, "Shape": "Cylinder", "Position": [-3.5, 0.5, 0], "Rotation": [0, 0, 90], "Scale": [1, 3, 1], "ColorHex": "#CCCCCC", "Material": "Metal" },
                { "Id": "hab_pod_r", "ParentId": null, "Shape": "Sphere", "Position": [-5.5, 0.75, 0], "Rotation": [0, 0, 0], "Scale": [2.5, 1.5, 2.5], "ColorHex": "#FFFFFF", "Material": "Plastic" },
                { "Id": "airlock_main", "ParentId": null, "Shape": "Box", "Position": [0, 0.6, 2.5], "Rotation": [0, 0, 0], "Scale": [1.2, 1.2, 1.5], "ColorHex": "#999999", "Material": "Metal" },
                { "Id": "solar_mount_a", "ParentId": null, "Shape": "Cylinder", "Position": [3.5, 0.75, 3.5], "Rotation": [0, 0, 0], "Scale": [0.15, 1.5, 0.15], "ColorHex": "#444444", "Material": "Metal" },
                { "Id": "solar_panel_a", "ParentId": null, "Shape": "Box", "Position": [3.5, 1.5, 3.5], "Rotation": [25, 45, 0], "Scale": [3, 0.05, 1.5], "ColorHex": "#000066", "Material": "Glass" },
                { "Id": "solar_mount_b", "ParentId": null, "Shape": "Cylinder", "Position": [-3.5, 0.75, 3.5], "Rotation": [0, 0, 0], "Scale": [0.15, 1.5, 0.15], "ColorHex": "#444444", "Material": "Metal" },
                { "Id": "solar_panel_b", "ParentId": null, "Shape": "Box", "Position": [-3.5, 1.5, 3.5], "Rotation": [25, -45, 0], "Scale": [3, 0.05, 1.5], "ColorHex": "#000066", "Material": "Glass" },
                { "Id": "comms_tower", "ParentId": null, "Shape": "Cylinder", "Position": [0, 3.2, 0], "Rotation": [0, 0, 0], "Scale": [0.1, 2.5, 0.1], "ColorHex": "#AAAAAA", "Material": "Metal" },
                { "Id": "comms_dish", "ParentId": null, "Shape": "Cone", "Position": [0, 4.2, 0], "Rotation": [140, 0, 0], "Scale": [1.0, 0.5, 1.0], "ColorHex": "#FFFFFF", "Material": "Plastic" },
                { "Id": "status_light", "ParentId": null, "Shape": "Sphere", "Position": [0, 1.5, 2.05], "Rotation": [0, 0, 0], "Scale": [0.2, 0.2, 0.2], "ColorHex": "#00FF00", "Material": "Glow" }
            ]
        },
        RustDrone: {
            "Name": "Futuristic_Rust_Drone",
            "Parts": [
                { "Id": "main_chassis", "ParentId": null, "Shape": "Box", "Position": [0, 0, 0], "Rotation": [0, 0, 0], "Scale": [1, 0.5, 1.2], "ColorHex": "#5D4037", "Material": "Metal" },
                { "Id": "cockpit_canopy", "ParentId": "main_chassis", "Shape": "Sphere", "Position": [0, 0.25, 0.3], "Rotation": [0, 0, 0], "Scale": [0.7, 0.4, 0.6], "ColorHex": "#A9D0F5", "Material": "Glass" },
                { "Id": "engine_mount_fl", "ParentId": "main_chassis", "Shape": "Cylinder", "Position": [-0.6, 0, 0.5], "Rotation": [90, 0, 0], "Scale": [0.3, 0.6, 0.3], "ColorHex": "#3E2723", "Material": "Metal" },
                { "Id": "neon_core_fl", "ParentId": "engine_mount_fl", "Shape": "Cylinder", "Position": [0, -0.35, 0], "Rotation": [0, 0, 0], "Scale": [0.2, 0.1, 0.2], "ColorHex": "#00F2FF", "Material": "Glow" },
                { "Id": "engine_mount_fr", "ParentId": "main_chassis", "Shape": "Cylinder", "Position": [0.6, 0, 0.5], "Rotation": [90, 0, 0], "Scale": [0.3, 0.6, 0.3], "ColorHex": "#3E2723", "Material": "Metal" },
                { "Id": "neon_core_fr", "ParentId": "engine_mount_fr", "Shape": "Cylinder", "Position": [0, -0.35, 0], "Rotation": [0, 0, 0], "Scale": [0.2, 0.1, 0.2], "ColorHex": "#00F2FF", "Material": "Glow" },
                { "Id": "engine_mount_bl", "ParentId": "main_chassis", "Shape": "Cylinder", "Position": [-0.6, 0, -0.5], "Rotation": [90, 0, 0], "Scale": [0.3, 0.6, 0.3], "ColorHex": "#3E2723", "Material": "Metal" },
                { "Id": "neon_core_bl", "ParentId": "engine_mount_bl", "Shape": "Cylinder", "Position": [0, -0.35, 0], "Rotation": [0, 0, 0], "Scale": [0.2, 0.1, 0.2], "ColorHex": "#00F2FF", "Material": "Glow" },
                { "Id": "engine_mount_br", "ParentId": "main_chassis", "Shape": "Cylinder", "Position": [0.6, 0, -0.5], "Rotation": [90, 0, 0], "Scale": [0.3, 0.6, 0.3], "ColorHex": "#3E2723", "Material": "Metal" },
                { "Id": "neon_core_br", "ParentId": "engine_mount_br", "Shape": "Cylinder", "Position": [0, -0.35, 0], "Rotation": [0, 0, 0], "Scale": [0.2, 0.1, 0.2], "ColorHex": "#00F2FF", "Material": "Glow" },
                { "Id": "stabilizer_l", "ParentId": "main_chassis", "Shape": "Box", "Position": [-0.5, 0.3, -0.4], "Rotation": [0, 0, 45], "Scale": [0.1, 0.4, 0.4], "ColorHex": "#4E342E", "Material": "Metal" },
                { "Id": "stabilizer_r", "ParentId": "main_chassis", "Shape": "Box", "Position": [0.5, 0.3, -0.4], "Rotation": [0, 0, -45], "Scale": [0.1, 0.4, 0.4], "ColorHex": "#4E342E", "Material": "Metal" },
                { "Id": "thruster_glow", "ParentId": "main_chassis", "Shape": "Cone", "Position": [0, 0, -0.65], "Rotation": [-90, 0, 0], "Scale": [0.4, 0.4, 0.4], "ColorHex": "#FF3D00", "Material": "Glow" }
            ]
        },
        ViperScout: {
            "Name": "Viper_Scout_Mk2",
            "Timeline": [
                { "Target": "main_rotor", "Action": "Rotate", "Axis": "Y", "Speed": 0.5 }
            ],
            "Parts": [
                { "Id": "fuselage_main", "ParentId": null, "Shape": "Capsule", "Position": [0, 0, 0], "Rotation": [0, 0, 0], "Scale": [1.5, 0.8, 2.5], "ColorHex": "#111111", "Material": "Metal" },
                { "Id": "cockpit_sensor", "ParentId": "fuselage_main", "Shape": "Box", "Position": [0, 0.3, 0.5], "Rotation": [0, 0, 0], "Scale": [0.3, 0.1, 0.4], "ColorHex": "#EEEEEE", "Material": "Plastic" },
                { "Id": "tail_boom", "ParentId": "fuselage_main", "Shape": "Box", "Position": [0, 0, -1.8], "Rotation": [0, 0, 0], "Scale": [0.1, 0.1, 1.8], "ColorHex": "#333333", "Material": "Metal" },
                { "Id": "stabilizer_v", "ParentId": "tail_boom", "Shape": "Box", "Position": [0, 0.2, -0.8], "Rotation": [0, 0, 0], "Scale": [0.05, 0.6, 0.4], "ColorHex": "#222222", "Material": "Metal" },
                { "Id": "stabilizer_h", "ParentId": "tail_boom", "Shape": "Box", "Position": [0, 0, -0.7], "Rotation": [0, 0, 0], "Scale": [0.6, 0.05, 0.3], "ColorHex": "#222222", "Material": "Metal" },
                { "Id": "rotor_shaft", "ParentId": "fuselage_main", "Shape": "Cylinder", "Position": [0, 0.3, 0], "Rotation": [0, 0, 0], "Scale": [0.1, 0.6, 0.1], "ColorHex": "#444444", "Material": "Metal" },
                { "Id": "main_rotor", "ParentId": "rotor_shaft", "Shape": "Box", "Position": [0, 0.3, 0], "Rotation": [0, 0, 0], "Scale": [5.0, 0.05, 0.2], "ColorHex": "#222222", "Material": "Metal" },
                { "Id": "skid_l", "ParentId": "fuselage_main", "Shape": "Cylinder", "Position": [-0.6, -0.5, 0], "Rotation": [90, 0, 0], "Scale": [0.06, 2.5, 0.06], "ColorHex": "#333333", "Material": "Metal" },
                { "Id": "skid_r", "ParentId": "fuselage_main", "Shape": "Cylinder", "Position": [0.6, -0.5, 0], "Rotation": [90, 0, 0], "Scale": [0.06, 2.5, 0.06], "ColorHex": "#333333", "Material": "Metal" },
                { "Id": "skid_strut_fl", "ParentId": "fuselage_main", "Shape": "Box", "Position": [-0.6, -0.3, 0.5], "Rotation": [0, 0, 0], "Scale": [0.05, 0.5, 0.05], "ColorHex": "#222222", "Material": "Metal" },
                { "Id": "skid_strut_fr", "ParentId": "fuselage_main", "Shape": "Box", "Position": [0.6, -0.3, 0.5], "Rotation": [0, 0, 0], "Scale": [0.05, 0.5, 0.05], "ColorHex": "#222222", "Material": "Metal" },
                { "Id": "camera_pod", "ParentId": "fuselage_main", "Shape": "Sphere", "Position": [0, -0.4, 0.8], "Rotation": [0, 0, 0], "Scale": [0.4, 0.4, 0.4], "ColorHex": "#333333", "Material": "Metal" },
                { "Id": "camera_lens", "ParentId": "camera_pod", "Shape": "Sphere", "Position": [0, 0, 0.15], "Rotation": [0, 0, 0], "Scale": [0.2, 0.2, 0.2], "ColorHex": "#FF0000", "Material": "Glow" }
            ]
        },
        HeavyTank: {
            "Name": "Apex_Heavy_Tank_Mk2",
            "Tags": ["POI", "Targetable", "Hostile"],
            "Parts": [
                { "Id": "hull_main", "ParentId": null, "Shape": "Box", "Position": [0, 0.1, 0], "Rotation": [0, 0, 0], "Scale": [4.2, 0.8, 6.5], "ColorHex": "#111111", "Material": "Metal" },
                { "Id": "track_l", "ParentId": null, "Shape": "Box", "Position": [-2.8, 0.5, 0], "Rotation": [0, 0, 0], "Scale": [1.4, 1.8, 8.2], "ColorHex": "#444444", "Material": "Metal" },
                { "Id": "track_r", "ParentId": null, "Shape": "Box", "Position": [2.8, 0.5, 0], "Rotation": [0, 0, 0], "Scale": [1.4, 1.8, 8.2], "ColorHex": "#444444", "Material": "Metal" },
                { "Id": "turret_body", "ParentId": "hull_main", "Shape": "Box", "Position": [0, 1.0, -0.6], "Rotation": [0, 0, 0], "Scale": [3.4, 1.6, 4.8], "ColorHex": "#0A0A0A", "Material": "Metal" },
                { "Id": "barrel_main", "ParentId": "turret_body", "Shape": "Cylinder", "Position": [0, 0, 3.2], "Rotation": [90, 0, 0], "Scale": [0.25, 4.0, 0.25], "ColorHex": "#000000", "Material": "Metal" },
                { "Id": "muzzle_brake", "ParentId": "barrel_main", "Shape": "Box", "Position": [0, 2.5, 0], "Rotation": [0, 0, 0], "Scale": [0.9, 0.9, 0.9], "ColorHex": "#000000", "Material": "Metal" },
                { "Id": "hatch_cover", "ParentId": "turret_body", "Shape": "Box", "Position": [0.8, 0.8, 0.5], "Rotation": [0, 0, 0], "Scale": [1.2, 0.1, 1.2], "ColorHex": "#333333", "Material": "Metal" },
                { "Id": "sensor_glow", "ParentId": "turret_body", "Shape": "Sphere", "Position": [0.8, 0.4, 1.8], "Rotation": [0, 0, 0], "Scale": [0.25, 0.25, 0.25], "ColorHex": "#FF0000", "Material": "Glow" },
                { "Id": "antenna_rod", "ParentId": "turret_body", "Shape": "Cylinder", "Position": [-1.2, 1.0, -2.0], "Rotation": [0, 0, 0], "Scale": [0.03, 1.5, 0.03], "ColorHex": "#111111", "Material": "Metal" }
            ]
        }
    },

    init: function (canvasId, dotNetHelper) {
        this.canvas = document.getElementById(canvasId);
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.dotNetHelper = dotNetHelper;
        this.createScene();
        this.engine.runRenderLoop(() => { this.update(); this.scene.render(); });
        this.startHeartbeatPulse();
        window.addEventListener("resize", () => this.engine.resize());
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
        
        const env = this.scene.createDefaultEnvironment({ createSkybox: false, createGround: false, environmentTexture: "https://assets.babylonjs.com/environments/studio.env" });
        this.scene.environmentIntensity = 1.0;

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 300, height: 300 }, this.scene);
        const sandMat = new BABYLON.StandardMaterial("sand", this.scene);
        sandMat.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/sand.jpg", this.scene);
        sandMat.diffuseTexture.uScale = 50; sandMat.diffuseTexture.vScale = 50;
        ground.material = sandMat;

        this.camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 120, new BABYLON.Vector3(0, 0, 0), this.scene);
        this.camera.attachControl(this.canvas, true);

        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.8;

        this.drone = this.spawnAsset("ViperScout", new BABYLON.Vector3(0, 10, 0)).root;
        this.searchlight = new BABYLON.SpotLight("searchlight", new BABYLON.Vector3(0, -0.3, 0.8), new BABYLON.Vector3(0, -1, 0.3), Math.PI / 3, 2, this.scene);
        this.searchlight.parent = this.drone;

        this.spawnAsset("BaseAlpha", this.basePos);

        this.spawnAsset("HeavyTank", new BABYLON.Vector3(50, 0.1, 50), { id: "APEX_T_01" });
        this.spawnAsset("HeavyTank", new BABYLON.Vector3(-55, 0.1, 60), { id: "APEX_T_02" });
        this.spawnAsset("HeavyTank", new BABYLON.Vector3(0, 0.1, -60), { id: "APEX_T_03" });

        const pipeline = new BABYLON.DefaultRenderingPipeline("pp", true, this.scene, [this.camera]);
        pipeline.bloomEnabled = true; pipeline.bloomThreshold = 0.6; pipeline.bloomWeight = 0.5;
    },

    parseVec3: function(data, def = {x:0, y:0, z:0}) {
        if (!data) return new BABYLON.Vector3(def.x, def.y, def.z);
        if (Array.isArray(data)) return new BABYLON.Vector3(data[0] ?? def.x, data[1] ?? def.y, data[2] ?? def.z);
        return new BABYLON.Vector3(data.x ?? def.x, data.y ?? def.y, data.z ?? def.z);
    },

    createMaterial: function(id, config) {
        const mat = new BABYLON.PBRMaterial("mat_" + id, this.scene);
        let color = BABYLON.Color3.FromHexString(config.ColorHex || "#FFFFFF");
        mat.albedoColor = color; mat.metallic = 0.5; mat.roughness = 0.4;

        const type = (config.Material || "Plastic").toLowerCase();
        if (type.includes("metal")) { mat.metallic = 1.0; mat.roughness = 0.1; }
        else if (type.includes("glass")) { mat.alpha = 0.4; mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND; mat.roughness = 0.05; }
        else if (type.includes("glow")) { mat.emissiveColor = color; mat.emissiveIntensity = 3.0; }
        
        mat.reflectionTexture = this.scene.environmentTexture;
        return mat;
    },

    runTimeline: function(assetInstance) {
        if (!assetInstance.schematic.Timeline) return;
        this.scene.onBeforeRenderObservable.add(() => {
            assetInstance.schematic.Timeline.forEach(step => {
                const part = assetInstance.registry[step.Target];
                if (!part) return;
                if (step.Action === "Rotate") {
                    if (step.Axis === "Y") part.rotation.y += step.Speed;
                    else if (step.Axis === "X") part.rotation.x += step.Speed;
                } else if (step.Action === "Pulse") {
                    const val = (step.Min || 1.0) + Math.sin(Date.now() * step.Speed) * ((step.Max || 5.0) - (step.Min || 1.0));
                    if (part.material && part.material.emissiveIntensity !== undefined) part.material.emissiveIntensity = val;
                }
            });
        });
    },

    spawnAsset: function(schematicKey, position, meta = {}) {
        const schematic = this.SCHEMATICS[schematicKey];
        if (!schematic) return null;
        const res = this.spawnRecipe(schematic);
        const root = res.root; root.position = position;
        const assetId = meta.id || schematicKey + "_" + Math.random().toString(36).substr(2, 5);
        root.name = assetId + "_root";

        if (schematic.Tags && schematic.Tags.includes("POI")) {
            root.metadata = { id: assetId, type: "poi", shape: schematicKey, heat: "EXTREME", signal: "SCRAMBLED", pos: [position.x, position.y, position.z] };
            const triggerBox = BABYLON.MeshBuilder.CreateBox(assetId, { size: 6 }, this.scene);
            triggerBox.parent = root; triggerBox.visibility = 0; triggerBox.metadata = root.metadata;
        }

        this.runTimeline({ root, registry: res.registry, schematic });
        return res;
    },

    spawnRecipe: function(json, parentNode = null, registry = null) {
        const id = json.Id || "recipe_" + Math.random().toString(36).substr(2, 5);
        const container = new BABYLON.TransformNode(id, this.scene);
        if (parentNode) container.parent = parentNode;
        const reg = registry || {};

        json.Parts.forEach(p => {
            let mesh; const shape = (p.Shape || "Box").toLowerCase();
            const scale = this.parseVec3(p.Scale, {x:1, y:1, z:1});
            
            if (shape === "capsule") mesh = BABYLON.MeshBuilder.CreateCapsule(p.Id, { radius: 0.5, height: 1.0 }, this.scene);
            else if (shape === "sphere") mesh = BABYLON.MeshBuilder.CreateSphere(p.Id, { diameter: 1 }, this.scene);
            else if (shape === "cylinder") mesh = BABYLON.MeshBuilder.CreateCylinder(p.Id, { diameter: 1, height: 1 }, this.scene);
            else if (shape === "cone") mesh = BABYLON.MeshBuilder.CreateCylinder(p.Id, { diameterTop: 0, diameterBottom: 1, height: 1 }, this.scene);
            else mesh = BABYLON.MeshBuilder.CreateBox(p.Id, { size: 1 }, this.scene);

            mesh.scaling = scale; mesh.position = this.parseVec3(p.Position);
            const rot = this.parseVec3(p.Rotation);
            mesh.rotation = new BABYLON.Vector3(BABYLON.Tools.ToRadians(rot.x), BABYLON.Tools.ToRadians(rot.y), BABYLON.Tools.ToRadians(rot.z));
            mesh.material = this.createMaterial(p.Id, p);
            reg[p.Id] = mesh;
        });

        json.Parts.forEach(p => {
            const mesh = reg[p.Id]; mesh.computeWorldMatrix(true);
            if (p.ParentId && reg[p.ParentId]) {
                mesh.setParent(reg[p.ParentId]);
            } else {
                mesh.setParent(container);
            }
        });
        return { root: container, registry: reg };
    },

    launchAttackDrone: function (targetId) {
        const res = this.spawnAsset("RustDrone", this.basePos.add(new BABYLON.Vector3(0, 2, 0)));
        this.strikers.push({ id: "striker_" + Math.random().toString(36).substr(2, 5), root: res.root, targetId: targetId, state: "LAUNCHING", speed: 0.5 });
    },

    resetSensors: function() { this.detectedPOIs.clear(); },
    setPatrol: function(active) { this.isPatrolling = active; },

    update: function () {
        if (!this.drone) return;
        const scoutTarget = this.waypoints[this.currentWaypointIndex];
        const dist = BABYLON.Vector3.Distance(this.drone.position, scoutTarget);
        if (dist > 1.0) {
            const dir = scoutTarget.subtract(this.drone.position).normalize();
            this.drone.position.addInPlace(dir.scale(this.moveSpeed));
            this.drone.rotation.y += (Math.atan2(dir.x, dir.z) - this.drone.rotation.y) * this.rotateSpeed;
        } else { this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length; }
        this.scanForPOIs();

        for (let i = this.strikers.length - 1; i >= 0; i--) {
            const s = this.strikers[i]; const targetNode = this.scene.getNodeByName(s.targetId + "_root"); 
            if (s.state === "LAUNCHING") {
                s.root.position.y += 0.2; if (s.root.position.y >= 15) s.state = "INTERCEPTING";
            } else if (s.state === "INTERCEPTING") {
                if (!targetNode) { s.state = "RECOVERING"; continue; }
                const targetPos = targetNode.position; const dist = BABYLON.Vector3.Distance(s.root.position, targetPos);
                if (dist > 2.0) {
                    const dir = targetPos.subtract(s.root.position).normalize();
                    s.root.position.addInPlace(dir.scale(s.speed)); s.root.lookAt(targetPos);
                } else {
                    this.createExplosion(targetPos);
                    this.scene.meshes.filter(m => m.name.indexOf(s.targetId) !== -1).forEach(m => m.dispose());
                    this.scene.transformNodes.filter(t => t.name.indexOf(s.targetId) !== -1).forEach(t => t.dispose());
                    targetNode.dispose(); s.state = "RECOVERING";
                }
            } else if (s.state === "RECOVERING") {
                const distToBase = BABYLON.Vector3.Distance(s.root.position, this.basePos);
                if (distToBase > 4.0) {
                    const dir = this.basePos.add(new BABYLON.Vector3(0, 5, 0)).subtract(s.root.position).normalize();
                    s.root.position.addInPlace(dir.scale(s.speed)); s.root.lookAt(this.basePos);
                } else { s.root.dispose(); this.strikers.splice(i, 1); }
            }
        }
    },

    scanForPOIs: function () {
        this.scene.meshes.forEach(m => {
            if (m.metadata && m.metadata.type === "poi") {
                const dist = BABYLON.Vector3.Distance(this.drone.position, m.absolutePosition || m.position);
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
        explosion.emitter = pos; explosion.targetStopDuration = 1.0; explosion.start();
    }
};
