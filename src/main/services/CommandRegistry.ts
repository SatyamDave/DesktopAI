export interface Command {
  name: string;
  match: (intent: string, actions: string[], context: any) => boolean;
  execute: (actions: string[], context: any) => Promise<{ success: boolean; message: string }>;
}

export class CommandRegistry {
  private commands: Command[] = [];

  register(command: Command) {
    this.commands.push(command);
  }

  findAndExecute(intent: string, actions: string[], context: any) {
    const cmd = this.commands.find(c => c.match(intent, actions, context));
    if (!cmd) return Promise.resolve({ success: false, message: 'No matching command found.' });
    return cmd.execute(actions, context);
  }

  list() {
    return this.commands.map(c => c.name);
  }
}

export const commandRegistry = new CommandRegistry(); 