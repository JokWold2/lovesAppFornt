import { registerLocaleNamespace } from '@/utils/locale.js'
import { demandHallMessages } from './demandHallMessages.js'
import { demandWorkspaceMessages } from './demandWorkspaceMessages.js'

registerLocaleNamespace('demandHall', demandHallMessages)
const workspaceMessages = {}
const escrowMessages = {}
for (const locale in demandWorkspaceMessages) {
  workspaceMessages[locale] = demandWorkspaceMessages[locale].workspace
  escrowMessages[locale] = demandWorkspaceMessages[locale].escrow
}
registerLocaleNamespace('workspace', workspaceMessages)
registerLocaleNamespace('escrow', escrowMessages)
