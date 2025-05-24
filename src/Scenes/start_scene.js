class start_scene extends Phaser.Scene {
    constructor() {
        super("start_scene"); 
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.image("background", "Sprite/Backgrounds/blue.png");
    }

    create() {
        this.add.image(0, 0, "background")
        .setOrigin(0, 0)
        .setDisplaySize(this.scale.width, this.scale.height);
        this.add.text(175, 200, "🌌 Gallery Shooter 🌌", { fontSize: "32px", fill: "#ffffff" });
        this.add.text(175, 300, "Press [SPACE] to Start", { fontSize: "24px", fill: "#ffffff" });

        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start("game_scene");  // Switch to your main game scene
        });
    }
}
