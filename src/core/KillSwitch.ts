import { EventEmitter } from "events";
import { TargetVenue } from "./types";

export class KillSwitch extends EventEmitter {
  private engaged: boolean = false;
  private targets: TargetVenue[] = [];

  public registerTarget(target: TargetVenue): void {
    this.targets.push(target);
  }

  public isEngaged(): boolean {
    return this.engaged;
  }

  public async trigger(reason: string): Promise<void> {
    if (this.engaged) return;
    this.engaged = true;

    console.error(`🚨 [KILL SWITCH ACTIVATED]: ${reason}`);
    this.emit("activated", { reason, timestamp: new Date().toISOString() });

    for (const target of this.targets) {
      try {
        await target.cancelAllOrders();
        await target.closeAllPositions();
        console.log(`🔒 Secured target: ${target.name}`);
      } catch (err) {
        console.error(`❌ Failed to secure target: ${target.name}`, err);
      }
    }
  }

  public reset(): void {
    this.engaged = false;
    console.log("✅ Kill Switch disengaged. Normal operations resumed.");
  }
}