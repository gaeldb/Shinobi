var exec = require('child_process').exec
module.exports = function(s,config,lang,app,io){
    function getLastUsedCommits(numberOfCommits = 3){
        return new Promise((resolve) => {
            exec(`git log -${numberOfCommits} --pretty=format:"%H"`, function(err, response){
                try{
                    if(err){
                        console.error(err)
                        resolve([])
                    }else if(response){
                        const commitIds = response.toString().split('\n');
                        commitIds.shift();
                        resolve(commitIds)
                    }else{
                        resolve([])
                    }
                }catch(err){
                    console.error(err)
                    resolve([])
                }
            })
        })
    }
    var getRepositoryCommitId = function(callback){
        exec(`git rev-parse HEAD`,function(err,response){
            if(response){
                var data = response.toString()
                var isGitRespository = false
                if(data.indexOf('not a git repository') === -1){
                    s.currentVersion = data.trim()
                    isGitRespository = true
                    s.systemLog(`Current Version`, s.currentVersion)
                }
            }else if(err){
                s.debugLog('Git is not installed.')
            }
            if(callback)callback(!isGitRespository,data)
        })
    }
    s.onProcessReady(async () => {
        getRepositoryCommitId()
        s.versionsUsed = await getLastUsedCommits(3);
    })
}
