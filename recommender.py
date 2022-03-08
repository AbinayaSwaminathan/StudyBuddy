import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
import scipy.sparse as sp
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pymysql
import pandas as pd


def get_data():
    conn=pymysql.connect(host='studymatedb.crj65ur06nyl.us-east-1.rds.amazonaws.com',port=int(3306),user='admin',passwd='studymate2022#',db='studymate')
    df_registereduser=pd.read_sql_query("SELECT * FROM studymate.registered_user ",conn)
    return df_registereduser


def combine_data(data):

    data_recommend = data.drop(columns=['ru_id','email','name' ,'gender','phone','address','zipcode','date_registered','is_basicinfo','status','gpa','graduating_year','is_academicInfo','pref_university','pref_program','is_studypreferences','date_updated','exam_taking','degree','question1','question2','question3','question4','avgrating','courses'])

    data_recommend['combine'] = data_recommend[data_recommend.columns[0:6]].apply(
                                                                         lambda x: ','.join(x.dropna().astype(str)),axis=1)
    data_recommend = data_recommend.drop(columns=[ 'pref_gender','pref_studymode','pref_timezone','pref_exam','university','program'])
    return data_recommend


def transform_data(data_recommend,student_df):
    count = CountVectorizer(stop_words='english')
    count_matrix = count.fit_transform(data_recommend['combine'])
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(student_df['email'])
    combine_sparse = sp.hstack([count_matrix, tfidf_matrix], format='csr')
    cosine_sim = cosine_similarity(combine_sparse, combine_sparse)
    return cosine_sim


def recommend_student(email, data, combine, transform):
    indices = pd.Series(data.index, index = data['email'])
    index = indices[email]
    num=len(data)
    sim_scores = list(enumerate(transform[index]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    sim_scores = sim_scores[0:num]
    recommend=[]
    student_indices = [i[0] for i in sim_scores]

    student_id = data['ru_id'].iloc[student_indices]
    student_name = data['name'].iloc[student_indices]
    student_email = data['email'].iloc[student_indices]
    student_gender=data['gender'].iloc[student_indices]
    student_studymode=data['pref_studymode'].iloc[student_indices]
    student_timezone=data['pref_timezone'].iloc[student_indices]
    student_exam=data['pref_exam'].iloc[student_indices]
    student_university=data['pref_university'].iloc[student_indices]
    student_program=data['pref_program'].iloc[student_indices]

    recommendation_data = pd.DataFrame(columns=['Student_Id'])

    recommendation_data['Student_Id'] = student_id
    recommendation_data['Student_name']=student_name
    recommendation_data['Email'] = student_email
    recommendation_data['gender'] = student_gender
    recommendation_data['studymode'] = student_studymode
    recommendation_data['timezone'] = student_timezone
    recommendation_data['exam'] = student_exam
    recommendation_data['university'] = student_university
    recommendation_data['program'] = student_program

    recommend.append(student_id)
    return recommendation_data


def results(email):
    find_student=get_data()
    Student_id=find_student.loc[find_student['email'] == email, 'ru_id']
    combine_result=combine_data(find_student)
    transform_result=transform_data(combine_result,find_student)
    recommendations = recommend_student(email,find_student,combine_result,transform_result)
    return recommendations.to_dict('records')
