import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeFacebookPhotos,
  toggleFacebookPhotoSelection
} from './facebookPhotoSelection.js'

test('normalizes Facebook photos and removes duplicate or incomplete entries', () => {
  assert.deepEqual(normalizeFacebookPhotos([
    { id: '1', picture: 'https://cdn.example/1.jpg' },
    { id: '1', picture: 'https://cdn.example/duplicate.jpg' },
    { id: '2' },
    { id: '3', picture: 'https://cdn.example/3.jpg' }
  ]), [
    { id: '1', picture: 'https://cdn.example/1.jpg' },
    { id: '3', picture: 'https://cdn.example/3.jpg' }
  ])
})

test('does not select more Facebook photos than remaining profile slots', () => {
  let selected = []
  selected = toggleFacebookPhotoSelection(selected, '1', 2)
  selected = toggleFacebookPhotoSelection(selected, '2', 2)
  selected = toggleFacebookPhotoSelection(selected, '3', 2)

  assert.deepEqual(selected, ['1', '2'])
})

test('deselects an already selected Facebook photo', () => {
  assert.deepEqual(toggleFacebookPhotoSelection(['1', '2'], '1', 2), ['2'])
})
