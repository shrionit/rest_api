import express from 'express';
import bodyParse from 'body-parser';
import DB from '../db.js';

const route = express.Router(bodyParse);
route.get('/', (req, res)=>{
    const out = {
        "info": "Use studentID/submissionID",
    }
    res.send(JSON.stringify(out));
});
route.get('/:studentID', (req, res)=>{
    const studentID = req.params.studentID;
    const out = {
        "info": `Use ${studentID}/submissionID`,
    }
    res.send(JSON.stringify(out));
});
route.get('/:studentID/:submissionID', (req, res)=>{
    const studentID = req.params.studentID;
    const submissionID = req.params.submissionID;
    const out = {
        "info": `Use ${studentID}/${submissionID}`,
    }
    res.send(JSON.stringify(out));
});
export default route;