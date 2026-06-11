const Phaser = window.Phaser;

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Fonts are loaded via HTML link tags, audio is synthesized procedurally.
  }

  create() {
    this.scene.start('CoverScene');
  }
}
