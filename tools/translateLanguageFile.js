const fs = require('fs');
console.log('This translation tool uses a Google Translate scraper. Use responsibly or your IP will be blocked by Google from using the service.')
if(!process.argv[2]||!process.argv[3]||!process.argv[4]){
    console.log('You must input arguments.')
    console.log('# node translateLanguageFile.js <SOURCE> <FROM_LANGUAGE> <TO_LANGUAGE>')
    console.log('Example:')
    console.log('# node translateLanguageFile.js en_CA en ar')
    return
}
let translate = {};
try{
    translate = (require('@vitalets/google-translate-api')).translate
}catch(err){
    console.log(`You are missing a module to use this tool. Run "npm install @vitalets/google-translate-api" to install the required module.`)
    return
}
const langDir = `${__dirname}/../languages/`
const sourceLangauge = process.argv[3]
const inputFileLangauge = process.argv[2]
const inputFileName = inputFileLangauge + '.json'
const source = require(langDir + inputFileName)
const list = Object.keys(source)
console.log(list.length)
var extra = ''
var current = 1
var currentItem = list[0]
const outputFileLangauge = process.argv[4]
const outputFileName = outputFileLangauge + '.json'
const chosenFile = langDir + outputFileName
const generatedLanguageFilesPath = `${__dirname}/generatedLanguageFiles/`
const generatedFilePath = `${generatedLanguageFilesPath}${outputFileName}`
const throttleTime = parseInt(process.argv[5]) || 1000
const usePendingFileForOutputSource = process.argv[6] === '1'
let newList
try{
    const buildOutputSource = usePendingFileForOutputSource ? generatedFilePath : chosenFile
    console.log(`Source Path : ${buildOutputSource}`)
    eval(`newList = ${fs.readFileSync(buildOutputSource,'utf8')}`)
    console.log(`The word "Save" in this language : `,newList['Save'])
}catch(err){
    console.log(`There was an error loading : ${chosenFile}`)
    console.log(`Using blank base file. This will translate against all available terms!!!`)
    newList = {}
}
async function writeLanguageFile(theList,alternatePath){
    const newListAlphabetical = {}
    const sourceTermKeysOrdered = Object.keys(theList).sort()
    sourceTermKeysOrdered.forEach(function(y){
        newListAlphabetical[y] = theList[y]
    })
    await fs.promises.writeFile(alternatePath ? alternatePath : generatedFilePath,JSON.stringify(newListAlphabetical,null,3))
}
function asyncSetTimeout(timeout){
    return new Promise((resolve,reject) => {
        setTimeout(() => {
            resolve()
        },timeout || 1000)
    })
}
async function makeFolderForOutput(timeout){
    try{
        await fs.promises.mkdir(generatedLanguageFilesPath)
    }catch(err){
        console.log(err)
    }
}
async function moveNewLanguageFile(){
    try{
        await fs.promises.unlink(chosenFile)
    }catch(err){
        console.log('Failed to Delete old File!')
        console.log(err)
    }
    try{
        await writeLanguageFile(newList,chosenFile)
    }catch(err){
        console.log('Failed to Move File!')
        console.log(err)
    }
}
function runTranslation(termKey,numberInLine){
    return new Promise((resolve,reject) => {
        if(termKey === undefined)return false;
        const existingTerm = newList[termKey]
        if(existingTerm && existingTerm !== source[termKey]){
            resolve(existingTerm)
            console.log('found a rule for this one, skipping : ',source[termKey]);
            return
        }
        console.log(`${numberInLine} of ${list.length}`)
        translate(source[termKey], {
            to: outputFileLangauge,
            from: sourceLangauge
        }).then(res => {
            translation = res.text;
            newList[termKey] = translation;
            console.log(termKey,' ---> ',translation)
            setTimeout(() => {
                resolve(translation)
            },throttleTime)
        }).catch(err => {
            translation = `${source[termKey]}`
            console.log('translation failed : ',translation);
            console.error(err);
            newList[termKey] = translation;
            resolve()
        });
    })
}
async function runTranslatorOnSourceTerms(){
    try{
        await makeFolderForOutput()
        for (let i = 0; i < list.length; i++) {
            let termKey = list[i]
            await runTranslation(termKey,i)
            await writeLanguageFile(newList)
        }
        await moveNewLanguageFile()
        console.log('Building Language File Complete!')
    }catch(err){
        console.log(err)
        console.log('!!!!!!!!!!!!!!!----------------------')
        console.log('!!!!!!!!!!!!!!!----------------------')
        console.log('!!!!!!!!!!!!!!!----------------------')
        console.log('!!!!!!!!!!!!!!!----------------------')
        console.log('!!!!!!!!!!!!!!!----------------------')
        console.log('!!!!!!!!!!!!!!!----------------------')
        console.log('!!!!!!!!!!!!!!!----------------------')
        console.log(translate)
    }

}
runTranslatorOnSourceTerms()
