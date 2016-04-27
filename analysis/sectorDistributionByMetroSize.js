#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')
const process = require('process')

const argv = require('minimist')(process.argv.slice(2))

const ss = require('simple-statistics')


const usageMessage = `
    USAGE:
        This script will generate summary statistics on the metroZbp_by_year data.
        It takes the following command line flags:
            -d : (REQUIRED) Path to the metroZbp_by_year/ directory.
            -y : year (default is 2012)
            -n : number of bins in which to group metro areas by share variance (default is 5)
            --shareStat : either "empShare" or "estShare" (default is "empShare")\n`

if ((process.argv.length === 2) || (!argv.d)) {
    console.log(usageMessage)
    process.exit(0)
}



const dataDir = path.join(process.cwd(), argv.d)

const numOfBins = argv.n || 5

const year = argv.y || 2012

const yearFilePattern = new RegExp(`_${year}.json`)



const shareStat = argv.shareStat || 'empShare'

if ((shareStat != 'empShare') && (shareStat != 'estShare')) {
    console.error('The only supported --stats are "empShare" and "estShare".')
    process.exit(1)
}


let output = {
    year: year,
    shareStat: shareStat,
}

const nationalLevelDataPath = path.join(dataDir, '../metroZbp/national.json')

const nationalLevelDataForYear = JSON.parse(fs.readFileSync(nationalLevelDataPath))[year]

const nationalShareValues = Object.keys(nationalLevelDataForYear)
                                  .map(naics => nationalLevelDataForYear[naics][shareStat])
                                  .filter(v => !isNaN(v))


if (!nationalLevelDataForYear) {
    console.log(`Year ${year} is not in the data.`)
    process.exit(1)
}


output.nation = {
    max     : ss.max(nationalShareValues),
    mean    : ss.mean(nationalShareValues),
    variace : ss.variance(nationalShareValues)
}



const populationByMetroForYear = (() => {
    const populationDataPath = path.join(dataDir, '../msaPop.json')

    let popDataByMetro = JSON.parse(fs.readFileSync(populationDataPath))

    return Object.keys(popDataByMetro).reduce((acc, metro) => {
        acc[metro] = popDataByMetro[metro][year]
        return acc
    }, {})
})()




//http://stackoverflow.com/a/32511953
fs.readdir(dataDir, (err, files) => {

    if (err) {
        console.err('Could not get the list of files in', dataDir)
    }

    let filesForYear = files.filter(f => f.match(yearFilePattern))

    let allMetros = []

    let shareSummaryStatisticsByMetro = filesForYear.reduce((summaryStatsAcc, fileName) => {
        let metroCode = fileName.replace(yearFilePattern, '') 

        allMetros.push(metroCode)


        let dataFilePath = path.join(dataDir, fileName)

        let dataForMetroForYear = JSON.parse(fs.readFileSync(dataFilePath))

        let quotData = Object.keys(dataForMetroForYear).reduce((acc, naics) => {
            if ((naics === 'totalEmp') || (naics === 'totalEst')) { return acc }

            let nationalDataForNaics = nationalLevelDataForYear[naics]

            if (!nationalDataForNaics) {
                console.error(`ERROR: In metro ${metroCode}: Unrecognized naics code ${naics}.`)
                return acc
            }

            let nationalShare = nationalDataForNaics[shareStat]
            let metroShare = dataForMetroForYear[naics][shareStat]

            let shareQuot = metroShare/nationalShare

            acc[naics] = shareQuot

            return acc
        }, {})

        let allQuotShares = Object.keys(quotData).map(k => quotData[k])

        let max = ss.max(allQuotShares)
        let mean = ss.mean(allQuotShares)
        let variance = ss.variance(allQuotShares)

        summaryStatsAcc[metroCode] = {
            population: populationByMetroForYear[metroCode],
            max: max,
            mean: mean,
            variance: variance,
        }

        return summaryStatsAcc
    }, {})


    output.metro_level = shareSummaryStatisticsByMetro


    let allVariancesSorted = allMetros.map(m => shareSummaryStatisticsByMetro[m].variance)
                                      .filter(v => !isNaN(v))
                                      .sort()
    
    let quantiles = []
    for (let i = 1; i < numOfBins; ++i) {
        quantiles.push(ss.quantileSorted(allVariancesSorted, (i / numOfBins)))
    }

    let bins = []

    for (let i = 1; i < allMetros.length; ++i) {
        let metro = allMetros[i]

        let j = 0
        for (; j < numOfBins; ++j) {
            let quantile = quantiles[j]

            if (shareSummaryStatisticsByMetro[metro].variance > quantile) {
                continue
            } else {
                break
            }
        }        

        (bins[j] || (bins[j] = [])).push(metro)
    }

    output.varianceBins = bins

    console.log(JSON.stringify(output, null, 4))
})


