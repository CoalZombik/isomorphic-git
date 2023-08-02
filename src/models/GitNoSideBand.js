import { FIFO } from '../utils/FIFO.js'

import { GitPktLine } from './GitPktLine.js'

export class GitNoSideBand {
  static demux(input) {
    const read = GitPktLine.streamReader(input)

    const packetlines = new FIFO()
    const packfile = new FIFO()
    const progress = new FIFO()

    let isPackFile = false

    const nextBit = async function() {
      const line = await read()
      // Skip over flush packets
      if (line === null) return nextBit()
      // A made up convention to signal there's no more to read.
      if (line === true) {
        packetlines.end()
        progress.end()
        packfile.end()
        return
      }

      let destination = packfile
      if (!isPackFile) {
        if (line.slice(0, 4).toString('utf8') === 'PACK') isPackFile = true
        else destination = packetlines
      }
      destination.write(line)

      // Careful not to blow up the stack.
      // I think Promises in a tail-call position should be OK.
      nextBit()
    }
    nextBit()
    return {
      packetlines,
      packfile,
      progress,
    }
  }
}
