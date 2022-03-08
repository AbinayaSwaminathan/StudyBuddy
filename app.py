from flask import Flask,request,jsonify
from flask_cors import CORS
import recommender


app = Flask(__name__,template_folder='public/html')
CORS(app)

@app.route('/find-study-buddy', methods=['GET','POST'])
def recommend_students():
    res = recommender.results(request.args.get('email'))
    return jsonify(res)
def main():
    if flask.request.method == 'GET':
        return(flask.render_template('findstudybuddy.ejs'))
    if flask.request.method == 'POST':
        m_name=flask.request.form(email)
        m_name=m_name.email()
        result_final=recommend_students()
        student_id=[]
        for i in range(len(result_final)):
            student_id.append(result_final.iloc[i][1])
        return flask.render_template('findstudybuddy.ejs',studentids=student_id,search_email=m_name)

if __name__=='__main__':
    app.run(port = 5000, debug = True)
