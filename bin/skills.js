#!/usr/bin/env node

/**
 * skills - CLI for installing Agent Skills from GitHub repositories
 *
 * Usage:
 *   npx skills add <owner/repo>                        Install all skills
 *   npx skills add <owner/repo> --skill name1 name2   Install specific skills
 *   npx skills add <owner/repo> --list                 List available skills
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')

const SKILLS_DIR = path.join(process.cwd(), '.agents', 'skills')

function parseArgs(argv) {
  const args = { _: [], skill: [] }
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    if (arg === '--skill' || arg === '--skills') {
      i++
      while (i < argv.length && !argv[i].startsWith('--')) {
        args.skill.push(argv[i])
        i++
      }
    } else if (arg === '--list') {
      args.list = true
      i++
    } else if (arg === '--dir') {
      args.dir = argv[i + 1]
      i += 2
    } else if (arg === '--help' || arg === '-h') {
      args.help = true
      i++
    } else {
      args._.push(arg)
      i++
    }
  }
  return args
}

function printHelp() {
  console.log(`
skills - Install Agent Skills from GitHub repositories

Usage:
  npx skills add <owner/repo>                         Install all skills
  npx skills add <owner/repo> --skill <names...>      Install specific skills
  npx skills add <owner/repo> --list                  List available skills
  npx skills add <owner/repo> --dir <path>            Install to custom directory

Examples:
  npx skills add coreyhaines31/marketingskills
  npx skills add coreyhaines31/marketingskills --skill page-cro copywriting
  npx skills add coreyhaines31/marketingskills --list

Options:
  --skill <names...>    Install only the listed skills
  --list                List available skills in the repository
  --dir <path>          Install to a custom directory (default: .agents/skills)
  --help, -h            Show this help message
`.trim())
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'skills-cli/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error(`Failed to parse JSON from ${url}: ${data.slice(0, 200)}`))
        }
      })
    })
    req.on('error', reject)
  })
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'skills-cli/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode === 404) {
        return reject(new Error(`Not found: ${url}`))
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
  })
}

async function listSkillsInRepo(owner, repo) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/skills`
  try {
    const contents = await fetchJson(apiUrl)
    if (!Array.isArray(contents)) {
      throw new Error('Unexpected response from GitHub API')
    }
    return contents
      .filter(item => item.type === 'dir')
      .map(item => item.name)
  } catch (err) {
    throw new Error(`Failed to list skills from ${owner}/${repo}: ${err.message}`)
  }
}

async function fetchSkillFiles(owner, repo, skillName) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/skills/${skillName}`
  const contents = await fetchJson(apiUrl)
  return contents
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

async function downloadFile(url, destPath) {
  const content = await fetchText(url)
  ensureDir(path.dirname(destPath))
  fs.writeFileSync(destPath, content, 'utf8')
}

async function installSkill(owner, repo, skillName, targetDir) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
  let tree
  try {
    const response = await fetchJson(apiUrl)
    tree = response.tree
  } catch (err) {
    throw new Error(`Failed to fetch repo tree: ${err.message}`)
  }

  const skillPrefix = `skills/${skillName}/`
  const skillFiles = tree.filter(
    item => item.type === 'blob' && item.path.startsWith(skillPrefix)
  )

  if (skillFiles.length === 0) {
    throw new Error(`Skill "${skillName}" not found in ${owner}/${repo}`)
  }

  const skillDir = path.join(targetDir, skillName)
  ensureDir(skillDir)

  for (const file of skillFiles) {
    const relativePath = file.path.slice(skillPrefix.length)
    const destPath = path.join(skillDir, relativePath)
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file.path}`
    await downloadFile(rawUrl, destPath)
  }

  return skillFiles.length
}

async function main() {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)

  if (args.help || argv.length === 0) {
    printHelp()
    process.exit(0)
  }

  const [command, repoArg] = args._

  if (command !== 'add') {
    console.error(`Unknown command: ${command}`)
    console.error('Run "npx skills --help" for usage.')
    process.exit(1)
  }

  if (!repoArg) {
    console.error('Error: repository argument required (e.g. coreyhaines31/marketingskills)')
    process.exit(1)
  }

  const parts = repoArg.split('/')
  if (parts.length !== 2) {
    console.error(`Error: invalid repository format "${repoArg}" — expected "owner/repo"`)
    process.exit(1)
  }

  const [owner, repo] = parts
  const targetDir = args.dir ? path.resolve(args.dir) : SKILLS_DIR

  // --list: show available skills
  if (args.list) {
    console.log(`\nFetching skills from ${owner}/${repo}...\n`)
    try {
      const available = await listSkillsInRepo(owner, repo)
      console.log(`Available skills (${available.length}):\n`)
      for (const name of available) {
        console.log(`  ${name}`)
      }
      console.log('')
    } catch (err) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
    return
  }

  // Determine which skills to install
  let skillsToInstall
  try {
    const available = await listSkillsInRepo(owner, repo)
    if (args.skill.length > 0) {
      const invalid = args.skill.filter(s => !available.includes(s))
      if (invalid.length > 0) {
        console.error(`Error: skill(s) not found: ${invalid.join(', ')}`)
        console.error(`Available: ${available.join(', ')}`)
        process.exit(1)
      }
      skillsToInstall = args.skill
    } else {
      skillsToInstall = available
    }
  } catch (err) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }

  ensureDir(targetDir)
  console.log(`\nInstalling ${skillsToInstall.length} skill(s) to ${targetDir}/\n`)

  let installed = 0
  let failed = 0
  for (const skillName of skillsToInstall) {
    process.stdout.write(`  Installing ${skillName}... `)
    try {
      const fileCount = await installSkill(owner, repo, skillName, targetDir)
      console.log(`done (${fileCount} file${fileCount !== 1 ? 's' : ''})`)
      installed++
    } catch (err) {
      console.log(`FAILED: ${err.message}`)
      failed++
    }
  }

  console.log(`\n${installed} skill(s) installed${failed > 0 ? `, ${failed} failed` : ''}.`)
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error(`Unexpected error: ${err.message}`)
  process.exit(1)
})
