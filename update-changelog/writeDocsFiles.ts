import { ReleaseNotesBuilder } from './ReleaseNotesBuilder'
import fs from 'fs'

import { compare } from 'semver'

interface DocsReleaseNotesWriterOptions {
	version: string
	builder: ReleaseNotesBuilder
}

export async function writeDocsFiles({ version, builder }: DocsReleaseNotesWriterOptions) {
	const notes = await builder.buildReleaseNotes({ useDocsHeader: true })
	const title = builder.getTitle()

	const content = `+++
title = "${title}"
hide_menu = true
+++

<!-- Auto generated by update changelog github action -->

${notes}
`
	const releaseNotesDocsPath = `./docs/sources/release-notes`
	const releaseNotesName = `release-notes-${version.replace(/\./g, '-')}`
	const filePath = `${releaseNotesName}.md`
	const fullPath = `${releaseNotesDocsPath}/${filePath}`

	fs.writeFileSync(fullPath, content, { encoding: 'utf-8' })

	const indexFilePath = `_index.md`
	const indexFileFullPath = `${releaseNotesDocsPath}/${indexFilePath}`
	const indexFileContent = fs.readFileSync(indexFileFullPath, 'utf8')

	// check if reference already exists
	const findExistingReference = indexFileContent.indexOf('"' + releaseNotesName + '"')

	// only add reference if it does not exist already
	if (findExistingReference === -1) {
		// find the right place to put release notes into.
		const indexFileSplit = indexFileContent.split(/\r?\n/)
		const lineToUseWhenAddingNewReleaseNotes = findWhereToAddNewLine(indexFileSplit, version)
		// now write the new line, if nothing matching was found, just add it at the end as it means it is the earliest version
		indexFileSplit.splice(
			lineToUseWhenAddingNewReleaseNotes,
			0,
			`- [Release notes for ${version}]({{< relref "${filePath.replace('.md', '')}" >}})`,
		)

		fs.writeFileSync(indexFileFullPath, indexFileSplit.join('\n'), { encoding: 'utf8' })
	}
}

const findWhereToAddNewLine = (indexFileSplit: string[], version: string): number => {
	let indexFileCoursor = 0
	for (const indexFileSingleLine of indexFileSplit) {
		const lineVersion = indexFileSingleLine.match(
			/(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g,
		)
		// search until we find a version that is greater than the current version and add the line in between
		if (lineVersion && lineVersion[0] && compare(lineVersion[0], version) === -1) {
			break
		}
		indexFileCoursor++
	}

	// shift coursor one line above the trailing new line
	if (indexFileCoursor === indexFileSplit.length && indexFileSplit.slice(-1)[0] === '') {
		indexFileCoursor--
	}

	return indexFileCoursor
}
