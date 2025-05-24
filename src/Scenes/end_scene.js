class end_scene extends Phaser.Scene {
    constructor() {
        super("end_scene");
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalTime = data.time || 0;
    }

    create() {
        this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, "Game Over", {
            fontSize: "32px",
            fill: "#ffffff"
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2, `Score: ${this.finalScore}`, {
            fontSize: "24px",
            fill: "#ffffff"
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 40, `Time: ${Math.floor(this.finalTime / 1000)}s`, {
            fontSize: "24px",
            fill: "#ffffff"
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 100, "Press ESC to Restart", {
            fontSize: "18px",
            fill: "#ffffff"
        }).setOrigin(0.5);

        this.input.keyboard.once("keydown-ESC", () => {
            this.scene.start("game_scene");
        });
    }
}