import type * as Party from 'partykit/server';

/**
 * Main PartyKit server entry point
 * Routes to specific party handlers based on the party name
 */
export default class Server implements Party.Server {
  constructor(public room: Party.Room) {}

  async onRequest(request: Party.Request): Promise<Response> {
    return new Response('Principles PartyKit Server', { status: 200 });
  }
}
